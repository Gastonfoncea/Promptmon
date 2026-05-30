"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS, PAYMENT_TOKENS } from "@/contract";
import { ERC20_ABI } from "@/lib/erc20";

const promptmon = {
  address: PROMPTMON_ADDRESS,
  abi: PROMPTMON_ABI,
} as const;

export const USDC_ADDRESS = PAYMENT_TOKENS.USDC as `0x${string}`;

/** Stats de una criatura, tal como las devuelve getCreature. */
export interface Creature {
  atk: number;
  def: number;
  hp: number;
  spd: number;
  level: number;
  wins: number;
  glb: string;
}

/** Un desafío abierto, tal como lo devuelve getOpenChallenges. */
export interface OpenChallenge {
  cid: bigint;
  creatureId: bigint;
  challenger: `0x${string}`;
}

/** Total de criaturas acuñadas (nextId). */
export function useTotalCreatures() {
  const { data, ...rest } = useReadContract({
    ...promptmon,
    functionName: "nextId",
  });
  return { total: data ? Number(data) : 0, ...rest };
}

/** Precio del mint en mUSDC (unidades mínimas). */
export function useMintPrice() {
  const { data, ...rest } = useReadContract({
    ...promptmon,
    functionName: "mintPrice",
    args: [USDC_ADDRESS],
  });
  return { price: (data as bigint) ?? 0n, ...rest };
}

/** Lista de desafíos abiertos. */
export function useOpenChallenges() {
  const { data, ...rest } = useReadContract({
    ...promptmon,
    functionName: "getOpenChallenges",
  });
  const challenges = (data as OpenChallenge[] | undefined) ?? [];
  return { challenges, ...rest };
}

/** Una criatura por id. */
export function useCreature(id: bigint | number | undefined) {
  const { data, ...rest } = useReadContract({
    ...promptmon,
    functionName: "getCreature",
    args: id === undefined ? undefined : [BigInt(id)],
    query: { enabled: id !== undefined },
  });
  return { creature: data as Creature | undefined, ...rest };
}

/**
 * Lee TODAS las criaturas (0..total-1) en un solo multicall y las ordena por
 * wins desc para el leaderboard.
 */
export function useLeaderboard() {
  const { total } = useTotalCreatures();

  const contracts = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => ({
        ...promptmon,
        functionName: "getCreature",
        args: [BigInt(i)],
      })),
    [total],
  );

  const { data, ...rest } = useReadContracts({
    contracts,
    query: { enabled: total > 0 },
  });

  const rows = useMemo(() => {
    if (!data) return [] as Array<{ id: number; creature: Creature }>;
    return data
      .map((r, i) =>
        r.status === "success"
          ? { id: i, creature: r.result as unknown as Creature }
          : null,
      )
      .filter((x): x is { id: number; creature: Creature } => x !== null)
      .sort((a, b) => Number(b.creature.wins) - Number(a.creature.wins));
  }, [data]);

  return { rows, total, ...rest };
}

/** Balance de mUSDC de una address (en unidades mínimas, 6 decimales). */
export function useUsdcBalance(address: `0x${string}` | undefined) {
  const { data, ...rest } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
  return { balance: (data as bigint) ?? 0n, ...rest };
}
