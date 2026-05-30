// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {PromptMon} from "../src/PromptMon.sol";

/// @notice Deploy de PromptMon a Monad testnet (chain id 10143).
/// @dev Env: PRIVATE_KEY (deployer = owner).
/// Uso:
///   source .env
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast
contract Deploy is Script {
    function run() external returns (PromptMon pm) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // treasury = deployer salvo que se pase TREASURY en el entorno
        address treasury = vm.envOr("TREASURY", deployer);

        vm.startBroadcast(pk);
        pm = new PromptMon(deployer, treasury);
        vm.stopBroadcast();
        console.log("treasury:", treasury);

        console.log("PromptMon deployed at:", address(pm));
        console.log("owner/deployer:", deployer);
    }
}
