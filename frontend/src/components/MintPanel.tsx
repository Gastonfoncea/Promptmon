"use client";

import { useState } from "react";
import { STAT_MIN, STAT_TOTAL } from "@/contract";
import { type ChosenStats, useMintCreature } from "@/hooks/useMintCreature";
import { CreatureStats } from "./CreatureStats";

const STEP_LABEL: Record<string, string> = {
  minting: "Acuñando tu criatura…",
  reading: "Leyendo stats on-chain…",
};

type StatKey = keyof ChosenStats;
const STATS: { key: StatKey; label: string }[] = [
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "hp", label: "HP" },
  { key: "spd", label: "SPD" },
];

// Build inicial balanceado: 25/25/25/25 = 100.
const INITIAL: ChosenStats = { atk: 25, def: 25, hp: 25, spd: 25 };

export function MintPanel({ glbUrl }: { glbUrl: string }) {
  const { mint, step, error, result, reset } = useMintCreature();
  const [stats, setStats] = useState<ChosenStats>(INITIAL);

  const busy = step !== "idle" && step !== "done" && step !== "error";
  const used = stats.atk + stats.def + stats.hp + stats.spd;
  const remaining = STAT_TOTAL - used;
  const valid =
    used === STAT_TOTAL &&
    STATS.every(({ key }) => stats[key] >= STAT_MIN);

  function setStat(key: StatKey, value: number) {
    setStats((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      {result ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-emerald-400">
            ✅ Criatura #{result.tokenId.toString()} acuñada
          </p>
          <CreatureStats creature={result.creature} />
          <button
            type="button"
            onClick={() => {
              reset();
              setStats(INITIAL);
            }}
            className="mt-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            Crear otra
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              Repartí {STAT_TOTAL} puntos
            </span>
            <span
              className={`text-xs font-bold tabular-nums ${
                remaining === 0
                  ? "text-emerald-400"
                  : remaining < 0
                    ? "text-red-400"
                    : "text-[#a78bfa]"
              }`}
            >
              {remaining >= 0 ? `${remaining} sin asignar` : `${-remaining} de más`}
            </span>
          </div>

          {STATS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-10 text-xs font-semibold text-white/70">
                {label}
              </span>
              <input
                type="range"
                min={STAT_MIN}
                max={STAT_TOTAL - STAT_MIN * 3} // dejar mín para las otras 3
                value={stats[key]}
                disabled={busy}
                onChange={(e) => setStat(key, Number(e.target.value))}
                className="flex-1 accent-[#836EF9]"
              />
              <span className="w-8 text-right text-sm font-bold tabular-nums text-white">
                {stats[key]}
              </span>
            </div>
          ))}

          <button
            type="button"
            onClick={() => mint(glbUrl, stats)}
            disabled={busy || !valid}
            className="rounded-lg bg-[#836EF9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? (STEP_LABEL[step] ?? "Procesando…")
              : valid
                ? "Mintear NFT · 0.1 MON"
                : `Ajustá a ${STAT_TOTAL} puntos`}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}
