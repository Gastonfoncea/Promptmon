"use client";

import { useState } from "react";
import type { OwnedCreature } from "@/hooks/useArena";

type Key = "atk" | "def" | "hp" | "spd";
const STATS: { key: Key; label: string }[] = [
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "hp", label: "HP" },
  { key: "spd", label: "SPD" },
];

/**
 * Panel para repartir los puntos ganados al subir de nivel.
 * Solo aparece si la criatura tiene unspent > 0.
 */
export function AllocatePanel({
  creature,
  busy,
  onAllocate,
}: {
  creature: OwnedCreature;
  busy: boolean;
  onAllocate: (atk: number, def: number, hp: number, spd: number) => void;
}) {
  const [add, setAdd] = useState<Record<Key, number>>({
    atk: 0,
    def: 0,
    hp: 0,
    spd: 0,
  });

  const used = add.atk + add.def + add.hp + add.spd;
  const left = creature.unspent - used;

  if (creature.unspent === 0) return null;

  function bump(key: Key, delta: number) {
    setAdd((a) => {
      const next = a[key] + delta;
      if (next < 0) return a;
      if (delta > 0 && left <= 0) return a; // no pasarse del presupuesto
      return { ...a, [key]: next };
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-[#a78bfa]/40 bg-[#1a1033]/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#a78bfa]">
          ⬆️ #{creature.id.toString()} ganó {creature.unspent} puntos
        </span>
        <span className="text-xs tabular-nums text-white/60">
          {left} sin asignar
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {STATS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-10 text-xs font-semibold text-white/70">
              {label}
            </span>
            <span className="w-12 text-xs text-white/40">
              {creature[key]} → {creature[key] + add[key]}
            </span>
            <button
              type="button"
              onClick={() => bump(key, -1)}
              disabled={busy || add[key] === 0}
              className="h-6 w-6 rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums text-white">
              +{add[key]}
            </span>
            <button
              type="button"
              onClick={() => bump(key, 1)}
              disabled={busy || left <= 0}
              className="h-6 w-6 rounded bg-[#836EF9] text-white hover:bg-[#6f5be0] disabled:opacity-30"
            >
              +
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy || used === 0}
        onClick={() => onAllocate(add.atk, add.def, add.hp, add.spd)}
        className="mt-3 w-full rounded-lg bg-[#836EF9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Asignando…" : `Asignar ${used} puntos`}
      </button>
    </div>
  );
}
