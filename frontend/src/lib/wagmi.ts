import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { monadTestnet } from "viem/chains";

/**
 * Config de wagmi para PromptMon.
 *
 * - `injectedWallet`: abre la extensión (MetaMask, Rabby, etc.) directo.
 * - `walletConnectWallet`: muestra QR para conectar wallets móviles.
 *
 * El projectId de WalletConnect se lee de NEXT_PUBLIC_WC_PROJECT_ID
 * (frontend/.env.local, gitignoreado). Si no está seteado, WalletConnect
 * queda deshabilitado y solo se ofrece la extensión inyectada — así la app
 * nunca rompe por falta de projectId.
 */
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const wallets = projectId
  ? [injectedWallet, walletConnectWallet]
  : [injectedWallet];

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recomendadas",
      wallets,
    },
  ],
  {
    appName: "PromptMon",
    // Si no hay projectId, walletConnectWallet no está en la lista, así que
    // este placeholder no se usa nunca (injectedWallet no lo consume).
    projectId: projectId ?? "promptmon-injected-only",
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
