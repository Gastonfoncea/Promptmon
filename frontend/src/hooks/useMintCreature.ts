"use client";

import { useCallback, useState } from "react";
import { type Abi, erc20Abi, parseEventLogs } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import {
  PAYMENT_TOKENS,
  PROMPTMON_ABI,
  PROMPTMON_ADDRESS,
} from "@/contract";
import { erc20MintableAbi } from "@/lib/musdc";

const abi = PROMPTMON_ABI as Abi;
const USDC = PAYMENT_TOKENS.USDC as `0x${string}`;

/** Pasos del flujo de mint, para mostrar loading states claros. */
export type MintStep =
  | "idle"
  | "faucet" // pidiendo mUSDC al faucet
  | "approve" // aprobando que el contrato cobre
  | "minting" // acuñando el NFT
  | "reading" // leyendo tokenId + stats
  | "done"
  | "error";

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

/** Traduce errores crudos de la wallet/chain a algo legible para el usuario. */
function humanizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|rejected the request|denied/i.test(msg)) {
    return "Rechazaste la transacción en la wallet.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "No te alcanza el MON para el gas. Pedí del faucet de Monad.";
  }
  if (/TokenNotAccepted/.test(msg)) {
    return "El contrato no acepta ese token de pago.";
  }
  // Primera línea, sin el stack gigante de viem.
  return msg.split("\n")[0] ?? "Falló el mint.";
}

/**
 * Flujo de mint de PRO-21 contra el contrato real:
 *   1. faucet de mUSDC si el balance no alcanza
 *   2. approve si la allowance no alcanza
 *   3. mintCreature(glbUrl, USDC)
 *   4. leer tokenId del evento CreatureMinted + getCreature(id)
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
    async (glbUrl: string) => {
      if (!publicClient || !walletClient) {
        setError("Conectá la wallet primero.");
        setStep("error");
        return;
      }
      const account = walletClient.account.address;
      setError(null);
      setResult(null);

      try {
        const price = (await publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "mintPrice",
          args: [USDC],
        })) as bigint;
        if (price === BigInt(0)) throw new Error("TokenNotAccepted");

        // 1. Faucet de mUSDC si el balance no alcanza (pedimos de sobra para varios mints).
        const balance = (await publicClient.readContract({
          address: USDC,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account],
        })) as bigint;
        if (balance < price) {
          setStep("faucet");
          const hash = await walletClient.writeContract({
            address: USDC,
            abi: erc20MintableAbi,
            functionName: "mint",
            args: [account, price * BigInt(10)],
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }

        // 2. Approve si la allowance no alcanza.
        const allowance = (await publicClient.readContract({
          address: USDC,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account, PROMPTMON_ADDRESS],
        })) as bigint;
        if (allowance < price) {
          setStep("approve");
          const hash = await walletClient.writeContract({
            address: USDC,
            abi: erc20Abi,
            functionName: "approve",
            args: [PROMPTMON_ADDRESS, price],
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }

        // 3. Mint.
        setStep("minting");
        const mintHash = await walletClient.writeContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "mintCreature",
          args: [glbUrl, USDC],
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: mintHash,
        });

        // 4. tokenId del evento CreatureMinted + stats.
        setStep("reading");
        const logs = parseEventLogs({
          abi,
          eventName: "CreatureMinted",
          logs: receipt.logs,
        });
        const tokenId = (logs[0]?.args as { id?: bigint } | undefined)?.id;
        if (tokenId === undefined) {
          throw new Error("No se encontró el evento CreatureMinted en el recibo.");
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
