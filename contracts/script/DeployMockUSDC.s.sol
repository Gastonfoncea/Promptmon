// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PromptMon} from "../src/PromptMon.sol";

/// @notice Deploya mUSDC, lo habilita como pago en un PromptMon ya desplegado
///         y mintea saldo inicial al deployer para poder probar el mint.
/// @dev Variables de entorno (ver .env.example):
///      - PRIVATE_KEY        : deployer (debe ser el owner de PromptMon).
///      - PROMPTMON_ADDRESS  : address del PromptMon ya desplegado.
///      - MINT_PRICE_USDC    : precio del mint (default 10e6 = 10 mUSDC).
///      - FAUCET_AMOUNT      : saldo a mintear al deployer (default 1_000e6).
///
/// Uso:
///   source .env
///   forge script script/DeployMockUSDC.s.sol --rpc-url monad_testnet --broadcast
contract DeployMockUSDC is Script {
    function run() external returns (MockUSDC usdc) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address promptmon = vm.envAddress("PROMPTMON_ADDRESS");
        uint256 price = vm.envOr("MINT_PRICE_USDC", uint256(10e6));
        uint256 faucet = vm.envOr("FAUCET_AMOUNT", uint256(1_000e6));

        vm.startBroadcast(pk);

        usdc = new MockUSDC();
        usdc.mint(deployer, faucet);
        PromptMon(promptmon).setPaymentToken(address(usdc), price);

        vm.stopBroadcast();

        console.log("MockUSDC deployed at:", address(usdc));
        console.log("habilitado en PromptMon:", promptmon);
        console.log("precio del mint (mUSDC unidades):", price);
        console.log("saldo minteado al deployer:", faucet);
    }
}
