// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPromptMon {
    function mintCreature(string calldata glbUrl, address payToken) external returns (uint256);
}

/// @notice Intenta re-entrar mintCreature durante el callback onERC721Received
///         que dispara _safeMint. Si el guard nonReentrant funciona, la
///         re-entrada revierte y por ende el mint original también.
contract ReentrantMinter is IERC721Receiver {
    IPromptMon public immutable pm;
    address public immutable token;
    bool private _reentered;

    constructor(address pm_, address token_) {
        pm = IPromptMon(pm_);
        token = token_;
        IERC20(token_).approve(pm_, type(uint256).max);
    }

    function attack(string calldata glb) external returns (uint256) {
        return pm.mintCreature(glb, token);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        returns (bytes4)
    {
        if (!_reentered) {
            _reentered = true;
            // segundo mint dentro del callback del primero → debe revertir por nonReentrant
            pm.mintCreature("reenter", token);
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
