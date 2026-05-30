// Auto-generado para PROMPTMON. Importá ABI + address desde acá en el frontend.
// La ABI se regenera con: forge inspect PromptMon abi --json > frontend/src/PromptMon.abi.json
// La address se completa tras el deploy real a Monad testnet (ver contracts/DEPLOY.md).
import abi from "./PromptMon.abi.json";

export const PROMPTMON_ABI = abi;

/// Monad testnet
export const MONAD_TESTNET_CHAIN_ID = 10143;

/// Address del contrato desplegado. VACÍA hasta el deploy real:
/// completar con la salida de `forge script script/Deploy.s.sol --broadcast`.
export const PROMPTMON_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/// Stablecoins aceptados (completar con las addresses reales de Monad testnet).
export const PAYMENT_TOKENS = {
  USDC: "0x0000000000000000000000000000000000000000",
  USDT: "0x0000000000000000000000000000000000000000",
} as const;
