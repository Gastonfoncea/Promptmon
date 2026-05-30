"use client";

import { CreatureCanvas } from "./CreatureCanvas";
import { CreatureModel } from "./CreatureModel";
import { CreatureStats } from "./CreatureStats";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import type { OpenChallenge } from "@/hooks/useArena";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  challenge: OpenChallenge;
  isMine: boolean;
  /** Elegido como rival (para la barra de matchup). */
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onCancel: () => void;
}

export function ChallengeCard({
  challenge,
  isMine,
  selected,
  busy,
  onSelect,
  onCancel,
}: Props) {
  const { creature, challenger, creatureId } = challenge;

  const body = (
    <>
      <div className="h-40 overflow-hidden rounded-xl bg-black/30">
        <CreatureCanvas>
          <ModelErrorBoundary key={creature.glb}>
            <CreatureModel glbUrl={creature.glb} />
          </ModelErrorBoundary>
        </CreatureCanvas>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">
          #{creatureId.toString()}
        </span>
        <span className="text-[11px] text-white/50">
          lvl {creature.level} · {creature.wins} wins
        </span>
      </div>

      <CreatureStats creature={creature} />

      <div className="text-[11px] text-white/40">
        retador: {isMine ? "vos" : short(challenger)}
      </div>
    </>
  );

  // Desafío propio: no es rival, se puede cancelar.
  if (isMine) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#140d28]/80 p-3">
        {body}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Cancelando…" : "Cancelar desafío"}
        </button>
      </div>
    );
  }

  // Desafío ajeno: clic = elegirlo como rival (la pelea se dispara desde la barra).
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-3 rounded-2xl border p-3 text-left transition ${
        selected
          ? "border-[#836EF9] bg-[#836EF9]/10 ring-2 ring-[#836EF9]/40"
          : "border-white/10 bg-[#140d28]/80 hover:border-white/25"
      }`}
    >
      {body}
      <span
        className={`text-center text-[11px] font-semibold ${
          selected ? "text-[#a78bfa]" : "text-white/40"
        }`}
      >
        {selected ? "✓ rival elegido" : "elegir como rival"}
      </span>
    </button>
  );
}
