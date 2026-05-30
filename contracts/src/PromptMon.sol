// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PromptMon
/// @notice Juego on-chain en Monad testnet. El contrato de juego ES el ERC-721:
///         las criaturas no son una colección aparte. El mint es gratis y el
///         jugador REPARTE un pool fijo de 100 puntos entre ATK/DEF/HP/SPD
///         (mín 5 por stat), así hay estrategia pero nadie supera el total de
///         100 (anti "dios invencible"). Las batallas usan ownership interno +
///         un flag de lock (sin escrow externo): el desafío lockea la criatura
///         del retador, y al aceptar se resuelve y se transfiere el NFT perdedor
///         al ganador en la misma transacción.
contract PromptMon is ERC721, Ownable, ReentrancyGuard {
    /// @notice Pool total de puntos a repartir entre las stats.
    uint16 public constant STAT_TOTAL = 100;
    /// @notice Mínimo por stat (no podés dejar una en 0).
    uint16 public constant STAT_MIN = 5;

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

    /// @notice Tarifa de acuñación en MON nativo.
    uint256 public constant MINT_FEE = 0.1 ether;

    /// @notice Wallet que recibe las fees del mint.
    address public treasury;

    /// @notice Próximo id a acuñar (también es el total acuñado).
    uint256 public nextId;

    /// @notice Una criatura locked no se puede transferir, ni abrir/aceptar otro
    ///         desafío con ella, mientras espera rival.
    mapping(uint256 id => bool) public locked;

    /// @notice Puntos ganados al subir de nivel, sin asignar todavía. El dueño
    ///         los reparte a las stats con allocate().
    mapping(uint256 id => uint16) public unspentPoints;

    mapping(uint256 id => Creature) private _creatures;

    Challenge[] public challenges;

    event CreatureMinted(uint256 indexed id, address indexed owner, string glb);
    event ChallengeCreated(uint256 indexed cid, uint256 indexed creatureId);
    event ChallengeCancelled(uint256 indexed cid);
    event BattleResult(
        uint256 indexed winnerId, uint256 indexed loserId, address winner, address loser
    );
    event TreasurySet(address indexed treasury);
    event PointsAwarded(uint256 indexed id, uint16 points, uint16 newLevel);
    event StatsAllocated(uint256 indexed id, uint16 atk, uint16 def, uint16 hp, uint16 spd);

    error InvalidTreasury();
    error NotEnoughPoints(uint16 have, uint256 want);
    error NothingToAllocate();
    error EmptyGlbUrl();
    error BadStatTotal(uint256 sum); // la suma no da STAT_TOTAL
    error StatBelowMin(); // alguna stat < STAT_MIN
    error WrongFee(uint256 sent, uint256 required);
    error FeeTransferFailed();
    error NotCreatureOwner(uint256 id);
    error CreatureLocked(uint256 id);
    error ChallengeNotOpen(uint256 cid);
    error InvalidChallenge(uint256 cid);
    error SelfBattle();

    constructor(address initialOwner, address treasury_)
        ERC721("PromptMon", "PMON")
        Ownable(initialOwner)
    {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    /// @notice Actualiza la wallet que recibe las fees del mint.
    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    // --------------------------------------------------------------------- //
    //                                 Mint                                  //
    // --------------------------------------------------------------------- //

    /// @notice Acuña una criatura pagando MINT_FEE (0.1 MON) con stats elegidas
    ///         por el jugador. La suma de atk+def+hp+spd debe ser exactamente
    ///         STAT_TOTAL (100) y cada stat >= STAT_MIN (5). Así hay estrategia
    ///         sin "dios invencible". La fee se reenvía a la treasury.
    /// @param glbUrl URL del modelo 3D generado por el prompt.
    /// @param atk Ataque.
    /// @param def Defensa.
    /// @param hp Vida.
    /// @param spd Velocidad.
    /// @return id Id de la criatura acuñada.
    function mintCreature(string calldata glbUrl, uint16 atk, uint16 def, uint16 hp, uint16 spd)
        external
        payable
        nonReentrant
        returns (uint256 id)
    {
        if (msg.value != MINT_FEE) revert WrongFee(msg.value, MINT_FEE);
        if (bytes(glbUrl).length == 0) revert EmptyGlbUrl();
        if (atk < STAT_MIN || def < STAT_MIN || hp < STAT_MIN || spd < STAT_MIN) {
            revert StatBelowMin();
        }
        uint256 sum = uint256(atk) + def + hp + spd;
        if (sum != STAT_TOTAL) revert BadStatTotal(sum);

        id = nextId++;
        _creatures[id] =
            Creature({atk: atk, def: def, hp: hp, spd: spd, level: 1, wins: 0, glb: glbUrl});

        _safeMint(msg.sender, id);
        emit CreatureMinted(id, msg.sender, glbUrl);

        // Interacción: reenviar la fee a treasury (CEI + nonReentrant).
        (bool ok,) = treasury.call{value: msg.value}("");
        if (!ok) revert FeeTransferFailed();
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
        uint16 pts = _pointsForLevel(w.level); // según el nivel ANTES de subir
        unchecked {
            w.level += 1;
            w.wins += 1;
        }
        unspentPoints[winnerId] += pts;

        emit BattleResult(winnerId, loserId, winner, loser);
        emit PointsAwarded(winnerId, pts, w.level);
    }

    /// @notice Puntos otorgados al pasar de `level` a `level+1`:
    ///         1→2:10, 2→3:8, 3→4:6, 4→5:4, después 2 (piso).
    function _pointsForLevel(uint16 level) internal pure returns (uint16) {
        if (level >= 5) return 2;
        return 12 - 2 * level; // level 1→10, 2→8, 3→6, 4→4
    }

    // --------------------------------------------------------------------- //
    //                          Asignar puntos                              //
    // --------------------------------------------------------------------- //

    /// @notice Reparte puntos ganados a las stats de tu criatura. La suma de los
    ///         incrementos debe ser <= unspentPoints[id]. No se puede mientras la
    ///         criatura está en un desafío (locked).
    function allocate(uint256 id, uint16 atkAdd, uint16 defAdd, uint16 hpAdd, uint16 spdAdd)
        external
        nonReentrant
    {
        if (ownerOf(id) != msg.sender) revert NotCreatureOwner(id);
        if (locked[id]) revert CreatureLocked(id);

        uint256 total = uint256(atkAdd) + defAdd + hpAdd + spdAdd;
        if (total == 0) revert NothingToAllocate();

        uint16 have = unspentPoints[id];
        if (total > have) revert NotEnoughPoints(have, total);

        Creature storage c = _creatures[id];
        c.atk += atkAdd;
        c.def += defAdd;
        c.hp += hpAdd;
        c.spd += spdAdd;
        unspentPoints[id] = have - uint16(total);

        emit StatsAllocated(id, c.atk, c.def, c.hp, c.spd);
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
        uint256 base = (
            uint256(c.atk) * 12 + uint256(c.spd) * 11 + uint256(c.def) * 10 + uint256(c.hp) * 9
        ) / 10;
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

    function getCreature(uint256 id) external view returns (Creature memory) {
        _requireOwned(id);
        return _creatures[id];
    }

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
                open[j++] =
                    OpenChallenge({cid: i, creatureId: c.creatureId, challenger: c.challenger});
            }
        }
    }

    function challengeCount() external view returns (uint256) {
        return challenges.length;
    }
}
