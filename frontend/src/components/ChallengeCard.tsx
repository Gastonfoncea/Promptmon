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
  /** Hay una criatura propia seleccionada para aceptar. */
  canAccept: boolean;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export function ChallengeCard({
  challenge,
  isMine,
  canAccept,
  busy,
  onAccept,
  onCancel,
}: Props) {
  const { creature, challenger, creatureId } = challenge;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#140d28]/80 p-3">
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

      {isMine ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Cancelando…" : "Cancelar desafío"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAccept}
          disabled={busy || !canAccept}
          className="rounded-lg bg-[#836EF9] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
          title={canAccept ? "" : "Elegí una criatura tuya para pelear"}
        >
          {busy ? "Peleando…" : "Aceptar y pelear"}
        </button>
      )}
    </div>
  );
}
