// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/// @notice Imita el USDT real de mainnet: transfer/transferFrom NO devuelven bool.
///         Sirve para verificar que PromptMon use SafeERC20 (un require(token.transfer(...))
///         plano revertiría con este token). Implementación mínima ERC-20-like.
contract MockUSDTNoReturn {
    string public name = "Tether USD";
    string public symbol = "USDT";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    // OJO: sin valor de retorno, igual que el USDT real.
    function transfer(address to, uint256 amount) external {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }

    function transferFrom(address from, address to, uint256 amount) external {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}
