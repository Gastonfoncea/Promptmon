"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import { ERC20_ABI } from "@/lib/erc20";
import {
  USDC_ADDRESS,
  useMintPrice,
  useUsdcBalance,
} from "@/hooks/usePromptMon";

/**
 * Flujo de mint funcional (sin pulir): faucet → approve → mintCreature.
 * Recibe el glbUrl ya generado por PromptInput. Wirea las 3 txs on-chain.
 */
export function MintFlow({ glbUrl }: { glbUrl: string | null }) {
  const { address, isConnected } = useAccount();
  const { price } = useMintPrice();
  const { balance, refetch: refetchBalance } = useUsdcBalance(address);
  const { writeContractAsync, isPending } = useWriteContract();

  const [status, setStatus] = useState<string>("");
  const [lastTokenId, setLastTokenId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  useWaitForTransactionReceipt({ hash: txHash });

  const priceLabel = price ? formatUnits(price, 6) : "?";
  const balanceLabel = formatUnits(balance, 6);

  async function faucet() {
    if (!address) return;
    setStatus("Minteando mUSDC de prueba…");
    const hash = await writeContractAsync({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [address, BigInt(100_000000)], // 100 mUSDC
    });
    setTxHash(hash);
    setStatus("✅ 100 mUSDC en tu wallet. Refrescá saldo.");
    await refetchBalance();
  }

  async function mint() {
    if (!glbUrl) {
      setStatus("Primero generá una criatura (prompt arriba).");
      return;
    }
    try {
      setStatus("1/2 Aprobando gasto de mUSDC…");
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PROMPTMON_ADDRESS, price],
      });
      setTxHash(approveHash);

      setStatus("2/2 Acuñando criatura…");
      const mintHash = await writeContractAsync({
        address: PROMPTMON_ADDRESS,
        abi: PROMPTMON_ABI,
        functionName: "mintCreature",
        args: [glbUrl, USDC_ADDRESS],
      });
      setTxHash(mintHash);
      setStatus("✅ Criatura acuñada on-chain.");
      setLastTokenId("(ver en el leaderboard)");
      await refetchBalance();
    } catch (err) {
      setStatus(
        "❌ " + (err instanceof Error ? err.message.split("\n")[0] : "Falló el mint"),
      );
    }
  }

  if (!isConnected) {
    return (
      <p className="text-sm text-white/50">Conectá la wallet para mintear.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between text-sm text-white/70">
        <span>Saldo: {balanceLabel} mUSDC</span>
        <span>Precio: {priceLabel} mUSDC</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={faucet}
          disabled={isPending}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-50"
        >
          Faucet +100 mUSDC
        </button>
        <button
          type="button"
          onClick={mint}
          disabled={isPending || !glbUrl}
          className="flex-1 rounded-lg bg-[#836EF9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#6f5be0] disabled:opacity-40"
        >
          {glbUrl ? "Mintear criatura (10 mUSDC)" : "Generá una criatura primero"}
        </button>
      </div>

      {status && <p className="text-xs text-white/60">{status}</p>}
      {lastTokenId && (
        <p className="text-xs text-emerald-400">Última acuñada: {lastTokenId}</p>
      )}
    </div>
  );
}
