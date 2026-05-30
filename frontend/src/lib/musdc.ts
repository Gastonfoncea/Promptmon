import { erc20Abi } from "viem";

/**
 * ABI del mock USDC de Monad testnet: ERC-20 estándar + `mint(to, amount)`
 * público (faucet) para que cualquiera se dé fondos de prueba.
 */
export const erc20MintableAbi = [
  ...erc20Abi,
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
