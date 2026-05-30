"use client";

import { useCallback, useEffect, useState } from "react";
import { type Abi, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import type { Creature } from "@/hooks/useMintCreature";
import { humanizeTxError } from "@/lib/txError";

const abi = PROMPTMON_ABI as Abi;
// Bloque del deploy (ver contract.ts): acota getLogs para no escanear toda la chain.
const DEPLOY_BLOCK = BigInt(35097963);

/** ERC-721 Transfer, para enumerar las criaturas de una address sin Enumerable. */
const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
  ],
} as const;

export interface OwnedCreature extends Creature {
  id: bigint;
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
      const logs = await publicClient.getLogs({
        address: PROMPTMON_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: address },
        fromBlock: DEPLOY_BLOCK,
        toBlock: "latest",
      });
      const ids = [
        ...new Set(
          logs.map((l) => (l.args as { tokenId: bigint }).tokenId.toString()),
        ),
      ].map((s) => BigInt(s));

      const owned: OwnedCreature[] = [];
      for (const id of ids) {
        const owner = (await publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "ownerOf",
          args: [id],
        })) as string;
        if (owner.toLowerCase() !== address.toLowerCase()) continue;
        const creature = (await publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "getCreature",
          args: [id],
        })) as Creature;
        owned.push({ id, ...creature });
      }
      setCreatures(owned);
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
  };
}
