"use client";

import { useCallback, useEffect, useState } from "react";
import { type Abi } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import type { Creature } from "@/hooks/useMintCreature";

const abi = PROMPTMON_ABI as Abi;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

export interface LeaderboardEntry extends Creature {
  id: bigint;
  owner: `0x${string}`;
}

/**
 * Ranking on-chain ordenado por victorias (PRO-24).
 * Enumera las criaturas con nextId() + getCreature(id), y se re-lee solo cuando
 * llega un CreatureMinted o BattleResult (tiempo real, sin recargar). Polling de
 * respaldo por si el RPC no entrega los eventos.
 */
export function useLeaderboard() {
  const publicClient = usePublicClient();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const nextId = (await publicClient.readContract({
      address: PROMPTMON_ADDRESS,
      abi,
      functionName: "nextId",
    })) as bigint;

    const count = Number(nextId);
    const ids = Array.from({ length: count }, (_, i) => BigInt(i));

    const rows = await Promise.all(
      ids.map(async (id) => {
        const [creature, owner] = await Promise.all([
          publicClient.readContract({
            address: PROMPTMON_ADDRESS,
            abi,
            functionName: "getCreature",
            args: [id],
          }) as Promise<Creature>,
          publicClient
            .readContract({
              address: PROMPTMON_ADDRESS,
              abi,
              functionName: "ownerOf",
              args: [id],
            })
            .catch(() => ZERO) as Promise<`0x${string}`>,
        ]);
        return { id, owner, ...creature } satisfies LeaderboardEntry;
      }),
    );

    // Orden: más victorias, luego mayor nivel, luego id más bajo (antigüedad).
    rows.sort(
      (a, b) =>
        b.wins - a.wins || b.level - a.level || Number(a.id) - Number(b.id),
    );
    setEntries(rows);
    setLoading(false);
  }, [publicClient]);

  // Tiempo real: re-leer cuando se mintea o se resuelve una batalla.
  useWatchContractEvent({
    address: PROMPTMON_ADDRESS,
    abi,
    eventName: "CreatureMinted",
    onLogs: () => {
      refresh();
    },
  });
  useWatchContractEvent({
    address: PROMPTMON_ADDRESS,
    abi,
    eventName: "BattleResult",
    onLogs: () => {
      refresh();
    },
  });

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000); // respaldo si faltan eventos
    return () => clearInterval(t);
  }, [refresh]);

  return { entries, loading, refresh };
}
