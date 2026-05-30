// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {PromptMon} from "../src/PromptMon.sol";

/// @notice Deploy de PromptMon a Monad testnet (chain id 10143).
/// @dev Variables de entorno (ver .env.example):
///      - PRIVATE_KEY       : clave del deployer (será el owner).
///      - TREASURY          : wallet que recibe las fees (default: deployer).
///      - USDC_ADDRESS      : stablecoin USDC en Monad testnet (opcional).
///      - USDT_ADDRESS      : stablecoin USDT en Monad testnet (opcional).
///      - MINT_PRICE_USDC   : precio del mint en unidades del token (default 10e6 = 10 USDC).
///
/// Uso:
///   source .env
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
contract Deploy is Script {
    function run() external returns (PromptMon pm) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY", deployer);
        uint256 price = vm.envOr("MINT_PRICE_USDC", uint256(10e6));

        vm.startBroadcast(pk);

        pm = new PromptMon(deployer, treasury);

        // Habilitar stablecoins de pago si están seteados en el entorno.
        address usdc = vm.envOr("USDC_ADDRESS", address(0));
        if (usdc != address(0)) {
            pm.setPaymentToken(usdc, price);
        }
        address usdt = vm.envOr("USDT_ADDRESS", address(0));
        if (usdt != address(0)) {
            pm.setPaymentToken(usdt, price);
        }

        vm.stopBroadcast();

        console.log("PromptMon deployed at:", address(pm));
        console.log("owner/deployer:", deployer);
        console.log("treasury:", treasury);
        if (usdc != address(0)) console.log("USDC accepted:", usdc, "price:", price);
        if (usdt != address(0)) console.log("USDT accepted:", usdt, "price:", price);
        if (usdc == address(0) && usdt == address(0)) {
            console.log("WARN: ningun stablecoin habilitado. Corre setPaymentToken luego.");
        }
    }
}
