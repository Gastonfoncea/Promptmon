"use client";

import { CreatureCanvas } from "./CreatureCanvas";
import { CreatureModel } from "./CreatureModel";
import { CreatureStats } from "./CreatureStats";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import type { OpenChallenge, OwnedCreature } from "@/hooks/useArena";
import type { Creature } from "@/hooks/useMintCreature";

/** Un lado del matchup: modelo 3D + label + stats. */
function Side({
  creature,
  glb,
  label,
  tone,
}: {
  creature: Creature;
  glb: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex w-40 flex-col items-center gap-1.5">
      <div className="h-28 w-28 overflow-hidden rounded-xl bg-black/30">
        <CreatureCanvas>
          <ModelErrorBoundary key={glb}>
            <CreatureModel glbUrl={glb} />
          </ModelErrorBoundary>
        </CreatureCanvas>
      </div>
      <span className={`text-xs font-semibold ${tone}`}>{label}</span>
      <div className="w-full">
        <CreatureStats creature={creature} />
      </div>
    </div>
  );
}

/** Lado vacío con instrucción de qué elegir. */
function EmptySide({ text }: { text: string }) {
  return (
    <div className="flex h-28 w-40 items-center justify-center rounded-xl border border-dashed border-white/15 text-center text-xs text-white/40">
      {text}
    </div>
  );
}

interface Props {
  myCreature: OwnedCreature | null;
  myLocked: boolean;
  opponent: OpenChallenge | null;
  busyFight: boolean;
  busyCreate: boolean;
  onFight: () => void;
  onCreate: () => void;
}

/**
 * Barra de matchup fija (Approach 1): el partido actual siempre a la vista —
 * tu criatura (izq) ⚔️ VS el rival (der), con el botón de acción al centro.
 */
export function MatchupBar({
  myCreature,
  myLocked,
  opponent,
  busyFight,
  busyCreate,
  onFight,
  onCreate,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-6 rounded-2xl border border-[#836EF9]/30 bg-[#140d28]/70 p-5 backdrop-blur">
      {/* Izquierda: tu criatura */}
      {myCreature ? (
        <Side
          creature={myCreature}
          glb={myCreature.glb}
          label={`#${myCreature.id.toString()} · tuya`}
          tone="text-[#a78bfa]"
        />
      ) : (
        <EmptySide text="Elegí tu criatura ↓" />
      )}

      {/* Centro: VS + acción */}
      <div className="flex min-w-32 flex-col items-center gap-2">
        <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-white/70">
          VS
        </span>

        {!myCreature ? (
          <span className="text-center text-[11px] text-white/40">
            elegí tu criatura
          </span>
        ) : myLocked ? (
          <span className="text-center text-[11px] text-amber-300">
            ya está en un desafío
          </span>
        ) : opponent ? (
          <button
            type="button"
            onClick={onFight}
            disabled={busyFight}
            className="rounded-xl bg-[#836EF9] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6f5be0] disabled:opacity-50"
          >
            {busyFight ? "Peleando…" : "⚔️ PELEAR"}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onCreate}
              disabled={busyCreate}
              className="rounded-xl bg-[#836EF9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:opacity-50"
            >
              {busyCreate ? "Creando…" : "Abrir desafío"}
            </button>
            <span className="text-[10px] text-white/40">o elegí un rival →</span>
          </div>
        )}
      </div>

      {/* Derecha: el rival */}
      {opponent ? (
        <Side
          creature={opponent.creature}
          glb={opponent.creature.glb}
          label={`#${opponent.creatureId.toString()} · rival`}
          tone="text-white/80"
        />
      ) : (
        <EmptySide text="Elegí un desafío ↓" />
      )}
    </div>
  );
}
