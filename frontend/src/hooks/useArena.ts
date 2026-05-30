"use client";

import { useCallback, useEffect, useState } from "react";
import { type Abi, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import type { Creature } from "@/hooks/useMintCreature";
import { humanizeTxError } from "@/lib/txError";

const abi = PROMPTMON_ABI as Abi;

export interface OwnedCreature extends Creature {
  id: bigint;
  unspent: number; // puntos sin asignar (ganados al subir de nivel)
}

export interface OpenChallenge {
  cid: bigint;
  creatureId: bigint;
  challenger: `0x${string}`;
  creature: Creature;
}

export interface BattleOutcome {
  winnerId: bigint;
  loserId: bigint;
  winner: `0x${string}`;
  loser: `0x${string}`;
}

/** Criaturas que el usuario posee AHORA (minteadas o ganadas, sin las perdidas). */
export function useMyCreatures() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [creatures, setCreatures] = useState<OwnedCreature[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !address) {
      setCreatures([]);
      return;
    }
    setLoading(true);
    try {
      // Enumeramos por nextId + ownerOf (igual que el leaderboard). Evita eth_getLogs,
      // que el RPC público de Monad limita a 100 bloques por query.
      const nextId = (await publicClient.readContract({
        address: PROMPTMON_ADDRESS,
        abi,
        functionName: "nextId",
      })) as bigint;
      const count = Number(nextId);

      const all = await Promise.all(
        Array.from({ length: count }, (_, i) => BigInt(i)).map(async (id) => {
          const owner = (await publicClient
            .readContract({
              address: PROMPTMON_ADDRESS,
              abi,
              functionName: "ownerOf",
              args: [id],
            })
            .catch(() => null)) as string | null;
          if (!owner || owner.toLowerCase() !== address.toLowerCase()) {
            return null;
          }
          const [creature, unspent] = await Promise.all([
            publicClient.readContract({
              address: PROMPTMON_ADDRESS,
              abi,
              functionName: "getCreature",
              args: [id],
            }) as Promise<Creature>,
            publicClient.readContract({
              address: PROMPTMON_ADDRESS,
              abi,
              functionName: "unspentPoints",
              args: [id],
            }) as Promise<bigint>,
          ]);
          return { id, ...creature, unspent: Number(unspent) } satisfies OwnedCreature;
        }),
      );
      setCreatures(all.filter((c): c is OwnedCreature => c !== null));
    } finally {
      setLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { creatures, loading, refresh };
}

/** Desafíos abiertos, enriquecidos con los stats de la criatura del retador. Refresca solo. */
export function useOpenChallenges() {
  const publicClient = usePublicClient();
  const [challenges, setChallenges] = useState<OpenChallenge[]>([]);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const raw = (await publicClient.readContract({
      address: PROMPTMON_ADDRESS,
      abi,
      functionName: "getOpenChallenges",
    })) as ReadonlyArray<{
      cid: bigint;
      creatureId: bigint;
      challenger: `0x${string}`;
    }>;

    const enriched = await Promise.all(
      raw.map(async (ch) => {
        const creature = (await publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "getCreature",
          args: [ch.creatureId],
        })) as Creature;
        return { ...ch, creature } satisfies OpenChallenge;
      }),
    );
    setChallenges(enriched);
  }, [publicClient]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000); // "en vivo" sin recargar
    return () => clearInterval(t);
  }, [refresh]);

  return { challenges, refresh };
}

/** Acciones de la arena: crear / cancelar / aceptar desafío. */
export function useArenaActions(onChange?: () => void) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [busy, setBusy] = useState<string | null>(null); // ej. "create", "accept:3"
  const [error, setError] = useState<string | null>(null);
  const [lastBattle, setLastBattle] = useState<BattleOutcome | null>(null);

  const ready = Boolean(publicClient && walletClient);

  const send = useCallback(
    async (key: string, functionName: string, args: unknown[]) => {
      if (!publicClient || !walletClient) {
        setError("Conectá la wallet primero.");
        return null;
      }
      setError(null);
      setBusy(key);
      try {
        const hash = await walletClient.writeContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName,
          args,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        onChange?.();
        return receipt;
      } catch (e) {
        setError(humanizeTxError(e));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [publicClient, walletClient, onChange],
  );

  const createChallenge = useCallback(
    (myId: bigint) => send("create", "createChallenge", [myId]),
    [send],
  );

  const cancelChallenge = useCallback(
    (cid: bigint) => send(`cancel:${cid}`, "cancelChallenge", [cid]),
    [send],
  );

  const allocate = useCallback(
    (id: bigint, atk: number, def: number, hp: number, spd: number) =>
      send(`allocate:${id}`, "allocate", [id, atk, def, hp, spd]),
    [send],
  );

  const acceptChallenge = useCallback(
    async (cid: bigint, myId: bigint) => {
      const receipt = await send(`accept:${cid}`, "acceptChallenge", [
        cid,
        myId,
      ]);
      if (!receipt) return;
      const logs = parseEventLogs({
        abi,
        eventName: "BattleResult",
        logs: receipt.logs,
      });
      const battle = logs[0]?.args as BattleOutcome | undefined;
      if (battle) setLastBattle(battle);
    },
    [send],
  );

  return {
    ready,
    busy,
    error,
    lastBattle,
    clearBattle: () => setLastBattle(null),
    createChallenge,
    cancelChallenge,
    acceptChallenge,
    allocate,
  };
}
