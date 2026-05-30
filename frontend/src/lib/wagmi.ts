import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "viem/chains";

/**
 * Config de wagmi para PromptMon.
 * Usa la chain de Monad testnet built-in de viem (id 10143, RPC oficial, símbolo MON).
 *
 * WalletConnect: para connectors tipo WalletConnect hace falta un projectId
 * (https://cloud.reown.com). Para la demo con MetaMask inyectada alcanza con un
 * placeholder; setealo en NEXT_PUBLIC_WC_PROJECT_ID cuando lo tengas.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "PromptMon",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "promptmon-demo",
  chains: [monadTestnet],
  ssr: true,
});

export { monadTestnet };
