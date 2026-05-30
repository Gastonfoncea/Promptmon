"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { monadTestnet } from "@/lib/wagmi";

/** Acorta una address: 0x1234…abcd */
function shortAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Estado de la wallet (PRO-20).
 * - Conecta vía RainbowKit ConnectButton.
 * - Si la red no es Monad testnet, ofrece (e intenta) el switch automático.
 * - Muestra address + balance de MON.
 */
export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Evita mismatch de hidratación: wagmi no conoce el estado de la wallet en SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onWrongNetwork = isConnected && chainId !== monadTestnet.id;

  // Ofrecer switch automático apenas se detecta red incorrecta.
  useEffect(() => {
    if (onWrongNetwork && switchChain) {
      switchChain({ chainId: monadTestnet.id });
    }
  }, [onWrongNetwork, switchChain]);

  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: Boolean(address) && !onWrongNetwork },
  });

  if (!mounted) return null;

  if (!isConnected) {
    return <ConnectButton label="Conectar wallet" />;
  }

  if (onWrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        disabled={isSwitching}
        className="rounded-xl bg-[#836EF9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:opacity-60"
      >
        {isSwitching ? "Cambiando…" : "Cambiar a Monad testnet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
      <span className="font-medium text-white">
        {balance
          ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(3)} ${balance.symbol}`
          : "— MON"}
      </span>
      <span className="text-white/40">·</span>
      <span className="font-mono text-white/70">
        {address ? shortAddress(address) : ""}
      </span>
      <ConnectButton
        showBalance={false}
        accountStatus="avatar"
        chainStatus="none"
      />
    </div>
  );
}
