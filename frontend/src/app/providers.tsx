"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

/**
 * Providers globales de la app: wagmi (web3) + react-query (cache de wagmi) + RainbowKit (UI de wallet).
 * Es un client component porque estos providers usan estado/contexto del browser.
 */
export function Providers({ children }: { children: ReactNode }) {
  // QueryClient en estado para que sobreviva re-renders pero no se comparta entre requests SSR.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#836EF9" /* violeta Monad */ })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
