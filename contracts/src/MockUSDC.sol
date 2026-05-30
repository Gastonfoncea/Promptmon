// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Stablecoin de prueba para Monad testnet (6 decimales, como USDC).
///         Tiene mint() público a modo de faucet: cualquiera puede acuñarse
///         saldo para probar el flujo de mint de PromptMon. SOLO PARA TESTNET.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Faucet: acuña `amount` (en unidades mínimas, 6 decimales) a `to`.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
