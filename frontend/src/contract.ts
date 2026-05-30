// Auto-generado para PROMPTMON. Importá ABI + address desde acá en el frontend.
// La ABI se regenera con: forge inspect PromptMon abi --json > frontend/src/PromptMon.abi.json
import abi from "./PromptMon.abi.json";

export const PROMPTMON_ABI = abi;

/// Monad testnet
export const MONAD_TESTNET_CHAIN_ID = 10143;

/// Address del contrato desplegado en Monad testnet.
/// v4: mint 0.1 MON + stats elegidas + puntos al subir de nivel (allocate).
export const PROMPTMON_ADDRESS = "0xbA7dc6fc3a4A93B844181d6f82D6C4B1C76e30a6" as const;

/// Tarifa de mint en MON (wei). Debe coincidir con MINT_FEE del contrato.
export const MINT_FEE_WEI = BigInt("100000000000000000"); // 0.1 MON

/// Pool de stats y mínimo por stat (deben coincidir con el contrato).
export const STAT_TOTAL = 100;
export const STAT_MIN = 5;
