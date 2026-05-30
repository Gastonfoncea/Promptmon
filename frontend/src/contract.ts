// Auto-generado para PROMPTMON. Importá ABI + address desde acá en el frontend.
// La ABI se regenera con: forge inspect PromptMon abi --json > frontend/src/PromptMon.abi.json
// La address se completa tras el deploy real a Monad testnet (ver contracts/DEPLOY.md).
import abi from "./PromptMon.abi.json";

export const PROMPTMON_ABI = abi;

/// Monad testnet
export const MONAD_TESTNET_CHAIN_ID = 10143;

/// Address del contrato desplegado en Monad testnet.
/// Deploy tx: 0x605297cd7515297143160b8c6016b1e2cc4981a8c419f04430a25a5ec3fafd30 (block 35097963)
export const PROMPTMON_ADDRESS = "0xB61Dc153eB4B149C5cb6Ed46FD67c62063311932" as const;

/// Stablecoins aceptados en Monad testnet.
/// mUSDC: mock propio (6 dec, mint() público tipo faucet) habilitado a 10 mUSDC.
export const PAYMENT_TOKENS = {
  USDC: "0xD182ECE40977e5f8D91627399aA577Ae7b02fe97",
  USDT: "0x0000000000000000000000000000000000000000",
} as const;
