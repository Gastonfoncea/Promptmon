import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { monadTestnet } from "viem/chains";

/**
 * Config de wagmi para PromptMon.
 *
 * Usa SOLO el connector `injected` (extensión de MetaMask) — sin WalletConnect.
 * Motivo: el relay de WalletConnect necesita un projectId válido y agrega una
 * dependencia de red que puede fallar en vivo. Con `injectedWallet` la extensión
 * se abre directo, sin projectId ni websocket externo.
 *
 * Si más adelante querés QR para wallets móviles, sumá un projectId real
 * (https://cloud.reown.com) y volvé a getDefaultConfig o agregá walletConnectWallet.
 */
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recomendadas",
      // injectedWallet detecta la extensión inyectada (MetaMask, Rabby, etc.)
      // y la abre directo. No inicializa WalletConnect.
      wallets: [injectedWallet],
    },
  ],
  {
    appName: "PromptMon",
    // Requerido por la firma, pero injectedWallet no lo usa (no hay WalletConnect).
    projectId: "promptmon-injected-only",
  },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  ssr: true,
});

export { monadTestnet };
