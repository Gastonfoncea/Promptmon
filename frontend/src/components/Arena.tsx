"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import { useOpenChallenges, useTotalCreatures } from "@/hooks/usePromptMon";

/**
 * Arena funcional (sin pulir): listar desafíos abiertos, crear uno con tu
 * criatura y aceptar uno con otra. Wirea createChallenge / acceptChallenge.
 */
export function Arena() {
  const { isConnected } = useAccount();
  const { total } = useTotalCreatures();
  const { challenges, refetch } = useOpenChallenges();
  const { writeContractAsync, isPending } = useWriteContract();

  const [myId, setMyId] = useState("");
  const [status, setStatus] = useState("");

  async function createChallenge() {
    try {
      setStatus("Creando desafío…");
      await writeContractAsync({
        address: PROMPTMON_ADDRESS,
        abi: PROMPTMON_ABI,
        functionName: "createChallenge",
        args: [BigInt(myId)],
      });
      setStatus("✅ Desafío creado.");
      await refetch();
    } catch (err) {
      setStatus("❌ " + errMsg(err));
    }
  }

  async function accept(cid: bigint) {
    if (myId === "") {
      setStatus("Poné el id de TU criatura para aceptar.");
      return;
    }
    try {
      setStatus(`Aceptando desafío #${cid}…`);
      await writeContractAsync({
        address: PROMPTMON_ADDRESS,
        abi: PROMPTMON_ABI,
        functionName: "acceptChallenge",
        args: [cid, BigInt(myId)],
      });
      setStatus("✅ Batalla resuelta. Mirá el leaderboard.");
      await refetch();
    } catch (err) {
      setStatus("❌ " + errMsg(err));
    }
  }

  if (!isConnected) {
    return <p className="text-sm text-white/50">Conectá la wallet para entrar a la arena.</p>;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center gap-2">
        <input
          value={myId}
          onChange={(e) => setMyId(e.target.value.replace(/\D/g, ""))}
          placeholder="id de tu criatura"
          className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={createChallenge}
          disabled={isPending || myId === ""}
          className="rounded-lg bg-[#836EF9] px-3 py-2 text-sm font-semibold text-white hover:bg-[#6f5be0] disabled:opacity-40"
        >
          Crear desafío
        </button>
        <span className="text-xs text-white/40">criaturas acuñadas: {total}</span>
      </div>

      <h3 className="text-sm font-semibold text-white/80">
        Desafíos abiertos ({challenges.length})
      </h3>
      {challenges.length === 0 ? (
        <p className="text-xs text-white/40">No hay desafíos abiertos.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {challenges.map((c) => (
            <li
              key={c.cid.toString()}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm"
            >
              <span className="text-white/80">
                #{c.cid.toString()} — criatura {c.creatureId.toString()} ·{" "}
                <span className="font-mono text-white/40">
                  {c.challenger.slice(0, 6)}…{c.challenger.slice(-4)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => accept(c.cid)}
                disabled={isPending}
                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Aceptar
              </button>
            </li>
          ))}
        </ul>
      )}

      {status && <p className="text-xs text-white/60">{status}</p>}
    </div>
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message.split("\n")[0] : "Falló la operación";
}
