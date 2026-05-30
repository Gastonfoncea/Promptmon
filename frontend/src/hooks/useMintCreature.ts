"use client";

import { useCallback, useState } from "react";
import { type Abi, parseEventLogs } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { MINT_FEE_WEI, PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";

const abi = PROMPTMON_ABI as Abi;

/** Pasos del flujo de mint (pago en MON: una sola tx). */
export type MintStep = "idle" | "minting" | "reading" | "done" | "error";

/** Stats on-chain de una criatura (struct getCreature). */
export interface Creature {
  atk: number;
  def: number;
  hp: number;
  spd: number;
  level: number;
  wins: number;
  glb: string;
}

export interface MintResult {
  tokenId: bigint;
  creature: Creature;
}

/** Stats elegidas por el jugador (deben sumar 100, cada una >= 5). */
export interface ChosenStats {
  atk: number;
  def: number;
  hp: number;
  spd: number;
}

function humanizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|rejected the request|denied/i.test(msg)) {
    return "Rechazaste la transacción en la wallet.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "No te alcanza el MON (fee 0.1 + gas). Pedí del faucet de Monad.";
  }
  if (/BadStatTotal/.test(msg)) return "Las stats deben sumar exactamente 100.";
  if (/StatBelowMin/.test(msg)) return "Cada stat debe ser al menos 5.";
  if (/WrongFee/.test(msg)) return "Fee incorrecta (debe ser 0.1 MON).";
  return msg.split("\n")[0] ?? "Falló el mint.";
}

/**
 * Mint pagable (0.1 MON) con stats elegidas por el jugador:
 *   1. mintCreature(glbUrl, atk, def, hp, spd) con value = MINT_FEE_WEI
 *   2. leer tokenId del evento CreatureMinted + getCreature(id)
 */
export function useMintCreature() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [step, setStep] = useState<MintStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
  }, []);

  const mint = useCallback(
    async (glbUrl: string, stats: ChosenStats) => {
      if (!publicClient || !walletClient) {
        setError("Conectá la wallet primero.");
        setStep("error");
        return;
      }
      setError(null);
      setResult(null);

      try {
        setStep("minting");
        const mintHash = await walletClient.writeContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "mintCreature",
          args: [glbUrl, stats.atk, stats.def, stats.hp, stats.spd],
          value: MINT_FEE_WEI,
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: mintHash,
        });

        setStep("reading");
        const logs = parseEventLogs({
          abi,
          eventName: "CreatureMinted",
          logs: receipt.logs,
        });
        const tokenId = (logs[0]?.args as { id?: bigint } | undefined)?.id;
        if (tokenId === undefined) {
          throw new Error("No se encontró el evento CreatureMinted.");
        }

        const creature = (await publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "getCreature",
          args: [tokenId],
        })) as Creature;

        setResult({ tokenId, creature });
        setStep("done");
      } catch (e) {
        setError(humanizeError(e));
        setStep("error");
      }
    },
    [publicClient, walletClient],
  );

  return { mint, step, error, result, reset };
}
