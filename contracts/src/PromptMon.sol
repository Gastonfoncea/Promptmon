// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PromptMon
/// @notice NFT (ERC-721) de criaturas generadas por prompt. El mint se paga en
///         MON nativo o en stablecoins (USDC/USDT/etc.) por el valor de ~10 USDC.
///         Cada token aceptado tiene un monto fijo configurable por el owner
///         (sin oráculo: para MON el owner mantiene el equivalente a mano).
///         Las fees se envían al instante a una wallet de tesorería.
/// @dev    PRO-6: base ERC-721 + mintCreature. Las stats (ATK/DEF/HP/SPD) y la
///         lógica de batalla llegan en PRO-7+ y extenderán el struct Creature.
contract PromptMon is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Sentinela para pagar con el token nativo (MON).
    address public constant NATIVE = address(0);

    struct Creature {
        string glb; // URL del modelo 3D (GLB) generado por Tripo
        // stats (atk/def/hp/spd/level/wins) se agregan en PRO-7
    }

    /// @notice Próximo id a acuñar (también es el total acuñado).
    uint256 public nextId;

    /// @notice Wallet que recibe las fees del mint.
    address public treasury;

    /// @notice Monto requerido por token aceptado. 0 = token no aceptado.
    ///         token => amount (en las unidades mínimas del token).
    mapping(address token => uint256 amount) public mintPrice;

    mapping(uint256 id => Creature) private _creatures;

    event CreatureMinted(
        uint256 indexed id, address indexed owner, string glbUrl, address payToken, uint256 amount
    );
    event PaymentTokenSet(address indexed token, uint256 amount);
    event TreasurySet(address indexed treasury);

    error InvalidTreasury();
    error EmptyGlbUrl();
    error TokenNotAccepted(address token);
    error WrongNativeValue(uint256 sent, uint256 required);
    error UnexpectedNativeValue();
    error NativeTransferFailed();
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

    /// @notice Habilita/ajusta un token de pago. `amount` en unidades mínimas
    ///         del token (p.ej. 10 USDC con 6 decimales = 10_000_000).
    ///         Pasar `amount = 0` deshabilita el token. Usar `NATIVE` (address(0))
    ///         para configurar el pago en MON.
    function setPaymentToken(address token, uint256 amount) external onlyOwner {
        mintPrice[token] = amount;
        emit PaymentTokenSet(token, amount);
    }

    // --------------------------------------------------------------------- //
    //                                 Mint                                  //
    // --------------------------------------------------------------------- //

    /// @notice Acuña una criatura pagando con `payToken`.
    /// @param glbUrl  URL del modelo 3D generado por el prompt.
    /// @param payToken Token de pago (NATIVE para MON, o address del ERC-20).
    /// @return id Id de la criatura acuñada.
    function mintCreature(string calldata glbUrl, address payToken)
        external
        payable
        nonReentrant
        returns (uint256 id)
    {
        if (bytes(glbUrl).length == 0) revert EmptyGlbUrl();

        uint256 price = mintPrice[payToken];
        if (price == 0) revert TokenNotAccepted(payToken);

        // Efectos: acuñar antes de las interacciones (CEI) + guard de reentrancy.
        id = nextId++;
        _creatures[id].glb = glbUrl;
        _safeMint(msg.sender, id);
        emit CreatureMinted(id, msg.sender, glbUrl, payToken, price);

        // Interacciones: cobrar y reenviar a tesorería.
        if (payToken == NATIVE) {
            if (msg.value != price) revert WrongNativeValue(msg.value, price);
            (bool ok,) = treasury.call{value: price}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            if (msg.value != 0) revert UnexpectedNativeValue();
            IERC20(payToken).safeTransferFrom(msg.sender, treasury, price);
        }
    }

    // --------------------------------------------------------------------- //
    //                                Views                                  //
    // --------------------------------------------------------------------- //

    /// @notice Devuelve la criatura `id`. Revierte si no existe.
    function getCreature(uint256 id) external view returns (Creature memory) {
        _requireOwned(id); // revierte ERC721NonexistentToken si no fue acuñada
        return _creatures[id];
    }
}
