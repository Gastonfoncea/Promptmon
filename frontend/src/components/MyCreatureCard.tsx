"use client";

import { CreatureCanvas } from "./CreatureCanvas";
import { CreatureModel } from "./CreatureModel";
import { CreatureStats } from "./CreatureStats";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import type { OwnedCreature } from "@/hooks/useArena";

interface Props {
  creature: OwnedCreature;
  selected: boolean;
  /** Ya está en un desafío abierto → no se puede usar. */
  locked: boolean;
  onSelect: () => void;
}

/** Tarjeta de una criatura propia con su modelo 3D, para identificarla y elegirla. */
export function MyCreatureCard({ creature, selected, locked, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onSelect}
      disabled={locked}
      className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-[#836EF9] bg-[#836EF9]/10 ring-2 ring-[#836EF9]/40"
          : locked
            ? "cursor-not-allowed border-white/5 opacity-50"
            : "border-white/10 hover:border-white/25"
      }`}
    >
      <div className="h-36 overflow-hidden rounded-xl bg-black/30">
        <CreatureCanvas>
          <ModelErrorBoundary key={creature.glb}>
            <CreatureModel glbUrl={creature.glb} />
          </ModelErrorBoundary>
        </CreatureCanvas>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">
          #{creature.id.toString()}
        </span>
        <span className="text-[11px] text-white/50">
          lvl {creature.level} · {creature.wins}w
        </span>
      </div>

      <CreatureStats creature={creature} />

      {locked && (
        <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          ⚔️ En desafío
        </span>
      )}
      {selected && !locked && (
        <span className="text-center text-[11px] font-semibold text-[#a78bfa]">
          ✓ lista para pelear
        </span>
      )}
    </button>
  );
}
