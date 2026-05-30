// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PromptMon
/// @notice Juego on-chain en Monad testnet. El contrato de juego ES el ERC-721:
///         las criaturas no son una colección aparte. El mint se paga en
///         stablecoins (USDC/USDT/etc.) por el valor de ~10 USDC y la fee va a
///         una wallet treasury. Las batallas usan ownership interno + un flag de
///         lock (sin escrow externo): el desafío lockea la criatura del retador,
///         y al aceptar se resuelve y se transfiere el NFT perdedor al ganador
///         en la misma transacción.
contract PromptMon is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Creature {
        uint16 atk;
        uint16 def;
        uint16 hp;
        uint16 spd;
        uint16 level;
        uint16 wins;
        string glb; // URL del modelo 3D (GLB) generado por Tripo
    }

    struct Challenge {
        uint256 creatureId;
        address challenger;
        bool open;
    }

    /// @notice Vista de un desafío abierto (para el frontend).
    struct OpenChallenge {
        uint256 cid;
        uint256 creatureId;
        address challenger;
    }

    /// @notice Próximo id a acuñar (también es el total acuñado).
    uint256 public nextId;

    /// @notice Wallet que recibe las fees del mint.
    address public treasury;

    /// @notice Precio del mint por stablecoin aceptado. 0 = token no aceptado.
    ///         En unidades mínimas del token (p.ej. 10 USDC = 10_000_000).
    mapping(address token => uint256 amount) public mintPrice;

    /// @notice Una criatura locked no se puede transferir, ni abrir/aceptar otro
    ///         desafío con ella, mientras espera rival.
    mapping(uint256 id => bool) public locked;

    mapping(uint256 id => Creature) private _creatures;

    Challenge[] public challenges;

    event CreatureMinted(uint256 indexed id, address indexed owner, string glb);
    event ChallengeCreated(uint256 indexed cid, uint256 indexed creatureId);
    event ChallengeCancelled(uint256 indexed cid);
    event BattleResult(
        uint256 indexed winnerId, uint256 indexed loserId, address winner, address loser
    );
    event PaymentTokenSet(address indexed token, uint256 amount);
    event TreasurySet(address indexed treasury);

    error InvalidTreasury();
    error EmptyGlbUrl();
    error TokenNotAccepted(address token);
    error NotCreatureOwner(uint256 id);
    error CreatureLocked(uint256 id);
    error ChallengeNotOpen(uint256 cid);
    error InvalidChallenge(uint256 cid);
    error SelfBattle();
    error NonexistentCreature(uint256 id);

    constructor(address initialOwner, address treasury_)
        ERC721("PromptMon", "PMON")
        Ownable(initialOwner)
    {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    // --------------------------------------------------------------------- //
    //                              Admin (owner)                            //
    // --------------------------------------------------------------------- //

    /// @notice Actualiza la wallet de tesorería que recibe las fees.
    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    /// @notice Habilita/ajusta un stablecoin de pago. `amount` en unidades
    ///         mínimas del token (p.ej. 10 USDC con 6 decimales = 10_000_000).
    ///         `amount = 0` deshabilita el token.
    function setPaymentToken(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert TokenNotAccepted(token);
        mintPrice[token] = amount;
        emit PaymentTokenSet(token, amount);
    }

    // --------------------------------------------------------------------- //
    //                                 Mint                                  //
    // --------------------------------------------------------------------- //

    /// @notice Acuña una criatura pagando con el stablecoin `payToken`.
    ///         Stats anti "dios invencible": pool fijo de ~100 pts repartido por
    ///         hash, así el prompt es solo estética y nadie puede gamear el poder.
    /// @param glbUrl   URL del modelo 3D generado por el prompt.
    /// @param payToken Stablecoin de pago (debe estar habilitado por el owner).
    /// @return id Id de la criatura acuñada.
    function mintCreature(string calldata glbUrl, address payToken)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (bytes(glbUrl).length == 0) revert EmptyGlbUrl();

        uint256 price = mintPrice[payToken];
        if (price == 0) revert TokenNotAccepted(payToken);

        id = nextId++;

        // Reparto de stats desde el hash. Total == 100 salvo cuando aplica el
        // piso de SPD (sum de atk+def+hp > 95), documentado como tolerancia.
        uint256 h = uint256(keccak256(abi.encodePacked(id, msg.sender, glbUrl, block.timestamp)));
        uint16 atk = uint16(h % 40 + 10); // 10..49
        uint16 def = uint16((h >> 16) % 40 + 10); // 10..49
        uint16 hp = uint16((h >> 32) % 40 + 10); // 10..49
        uint256 sum = uint256(atk) + def + hp;
        uint16 spd = sum + 5 <= 100 ? uint16(100 - sum) : 5; // piso de 5

        _creatures[id] = Creature({atk: atk, def: def, hp: hp, spd: spd, level: 1, wins: 0, glb: glbUrl});

        _safeMint(msg.sender, id);
        emit CreatureMinted(id, msg.sender, glbUrl);

        // Interacción: cobrar y reenviar a tesorería (SafeERC20 soporta USDT real).
        IERC20(payToken).safeTransferFrom(msg.sender, treasury, price);
    }

    // --------------------------------------------------------------------- //
    //                              Challenges                               //
    // --------------------------------------------------------------------- //

    /// @notice Abre un desafío poniendo tu criatura en el ring. El NFT NO se
    ///         mueve: solo se lockea para que no puedas transferirlo ni meterlo
    ///         en otra pelea mientras espera rival.
    function createChallenge(uint256 myId) external nonReentrant returns (uint256 cid) {
        if (ownerOf(myId) != msg.sender) revert NotCreatureOwner(myId);
        if (locked[myId]) revert CreatureLocked(myId);

        locked[myId] = true;
        challenges.push(Challenge({creatureId: myId, challenger: msg.sender, open: true}));
        cid = challenges.length - 1;
        emit ChallengeCreated(cid, myId);
    }

    /// @notice Cancela tu desafío abierto y libera tu criatura.
    function cancelChallenge(uint256 cid) external nonReentrant {
        if (cid >= challenges.length) revert InvalidChallenge(cid);
        Challenge storage c = challenges[cid];
        if (!c.open) revert ChallengeNotOpen(cid);
        if (c.challenger != msg.sender) revert NotCreatureOwner(c.creatureId);

        c.open = false;
        locked[c.creatureId] = false;
        emit ChallengeCancelled(cid);
    }

    /// @notice Acepta un desafío con tu criatura: resuelve la batalla y transfiere
    ///         el NFT perdedor al ganador en la MISMA transacción (atómico).
    function acceptChallenge(uint256 cid, uint256 myId) external nonReentrant {
        if (cid >= challenges.length) revert InvalidChallenge(cid);
        Challenge storage c = challenges[cid];
        if (!c.open) revert ChallengeNotOpen(cid);
        if (ownerOf(myId) != msg.sender) revert NotCreatureOwner(myId);
        if (locked[myId]) revert CreatureLocked(myId);

        uint256 challengerId = c.creatureId;
        if (challengerId == myId) revert SelfBattle();

        // Efectos: cerrar challenge y liberar locks ANTES de transferir, así el
        // _update override no bloquea la transferencia del bicho perdedor.
        c.open = false;
        locked[challengerId] = false;

        uint256 winnerId = _resolve(challengerId, myId);
        uint256 loserId = winnerId == challengerId ? myId : challengerId;

        address winner = ownerOf(winnerId);
        address loser = ownerOf(loserId);

        // Interacción interna: transferencia del ERC-721 (sin escrow externo).
        _transfer(loser, winner, loserId);

        Creature storage w = _creatures[winnerId];
        unchecked {
            w.level += 1;
            w.wins += 1;
        }

        emit BattleResult(winnerId, loserId, winner, loser);
    }

    // --------------------------------------------------------------------- //
    //                              Batalla                                  //
    // --------------------------------------------------------------------- //

    /// @dev Determina el ganador. Empate (powerA >= powerB) → gana el retador (A).
    ///      NOTA: rand es único para ambos, así que rand%20 se suma igual a los
    ///      dos y no altera la comparación (el azar no decide). Si se quiere que
    ///      el random pese, derivar un rand por criatura.
    function _resolve(uint256 idA, uint256 idB) internal view returns (uint256) {
        uint256 rand = uint256(keccak256(abi.encodePacked(block.prevrandao, idA, idB)));
        return _power(idA, rand) >= _power(idB, rand) ? idA : idB;
    }

    function _power(uint256 id, uint256 rand) internal view returns (uint256) {
        Creature storage c = _creatures[id];
        uint256 base = (uint256(c.atk) * 12 + uint256(c.spd) * 11 + uint256(c.def) * 10
            + uint256(c.hp) * 9) / 10;
        return base + uint256(c.level) * 5 + (rand % 20);
    }

    // --------------------------------------------------------------------- //
    //                           Transfer guard                             //
    // --------------------------------------------------------------------- //

    /// @dev Bloquea transferencias de criaturas locked. Permite mint (from==0)
    ///      y burn (to==0). Las transferencias internas de batalla liberan el
    ///      lock antes de llamar a _transfer, así que pasan.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && locked[tokenId]) {
            revert CreatureLocked(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    // --------------------------------------------------------------------- //
    //                                Views                                  //
    // --------------------------------------------------------------------- //

    /// @notice Devuelve la criatura `id`. Revierte si no existe.
    function getCreature(uint256 id) external view returns (Creature memory) {
        _requireOwned(id);
        return _creatures[id];
    }

    /// @notice Lista todos los desafíos abiertos (patrón simple para la demo).
    function getOpenChallenges() external view returns (OpenChallenge[] memory open) {
        uint256 total = challenges.length;
        uint256 count;
        for (uint256 i; i < total; ++i) {
            if (challenges[i].open) ++count;
        }
        open = new OpenChallenge[](count);
        uint256 j;
        for (uint256 i; i < total; ++i) {
            Challenge storage c = challenges[i];
            if (c.open) {
                open[j++] = OpenChallenge({cid: i, creatureId: c.creatureId, challenger: c.challenger});
            }
        }
    }

    /// @notice Cantidad total de desafíos creados (abiertos + cerrados).
    function challengeCount() external view returns (uint256) {
        return challenges.length;
    }
}
