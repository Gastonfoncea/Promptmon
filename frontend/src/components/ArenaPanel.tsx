"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { AllocatePanel } from "./AllocatePanel";
import { BattleCinematic } from "./BattleCinematic";
import { ChallengeCard } from "./ChallengeCard";
import { CreatureStats } from "./CreatureStats";
import { playImpact } from "@/lib/sfx";
import {
  useArenaActions,
  useMyCreatures,
  useOpenChallenges,
} from "@/hooks/useArena";

export function ArenaPanel() {
  const { address, isConnected } = useAccount();
  const { creatures, refresh: refreshMine } = useMyCreatures();
  const { challenges, refresh: refreshChallenges } = useOpenChallenges();

  // Una criatura propia seleccionada, usada para crear desafío o aceptar.
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const actions = useArenaActions(() => {
    refreshMine();
    refreshChallenges();
  });

  if (!isConnected) {
    return (
      <p className="py-12 text-center text-sm text-white/50">
        Conectá la wallet para entrar a la arena.
      </p>
    );
  }

  const selected = creatures.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      {/* Secuencia de batalla cinematográfica a pantalla completa (PRO-32) */}
      {actions.lastBattle && (
        <BattleCinematic
          outcome={actions.lastBattle}
          onClose={actions.clearBattle}
        />
      )}

      {/* Mis criaturas + crear desafío */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Tus criaturas
        </h2>
        {creatures.length === 0 ? (
          <p className="text-sm text-white/40">
            No tenés criaturas todavía. Generá y minteá una primero.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {creatures.map((c) => (
              <button
                key={c.id.toString()}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-40 rounded-xl border p-3 text-left transition ${
                  selectedId === c.id
                    ? "border-[#836EF9] bg-[#836EF9]/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <div className="mb-2 text-sm font-semibold text-white">
                  #{c.id.toString()}
                  <span className="ml-2 text-[11px] font-normal text-white/40">
                    lvl {c.level} · {c.wins}w
                  </span>
                </div>
                <CreatureStats creature={c} />
                {c.unspent > 0 && (
                  <span className="mt-1 inline-block rounded bg-[#a78bfa]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#a78bfa]">
                    +{c.unspent} pts
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Asignar puntos ganados a la criatura seleccionada */}
        {selected && selected.unspent > 0 && (
          <AllocatePanel
            creature={selected}
            busy={actions.busy === `allocate:${selected.id}`}
            onAllocate={(atk, def, hp, spd) =>
              actions.allocate(selected.id, atk, def, hp, spd)
            }
          />
        )}

        <button
          type="button"
          disabled={!selected || actions.busy === "create"}
          onClick={() => selected && actions.createChallenge(selected.id)}
          className="mt-4 rounded-xl bg-[#836EF9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {actions.busy === "create"
            ? "Creando desafío…"
            : selected
              ? `Abrir desafío con #${selected.id.toString()}`
              : "Elegí una criatura para desafiar"}
        </button>
      </section>

      {/* Desafíos abiertos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Desafíos abiertos ({challenges.length})
        </h2>
        {challenges.length === 0 ? (
          <p className="text-sm text-white/40">
            No hay desafíos abiertos. Abrí el primero 👆
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((ch) => {
              const isMine =
                ch.challenger.toLowerCase() === address?.toLowerCase();
              return (
                <ChallengeCard
                  key={ch.cid.toString()}
                  challenge={ch}
                  isMine={isMine}
                  canAccept={Boolean(selected)}
                  busy={
                    actions.busy === `accept:${ch.cid}` ||
                    actions.busy === `cancel:${ch.cid}`
                  }
                  onAccept={() => {
                    if (!selected) return;
                    playImpact(); // SFX: golpe al iniciar la batalla (PRO-25)
                    actions.acceptChallenge(ch.cid, selected.id);
                  }}
                  onCancel={() => actions.cancelChallenge(ch.cid)}
                />
              );
            })}
          </div>
        )}
      </section>

      {actions.error && (
        <p className="text-center text-xs text-red-400">{actions.error}</p>
      )}
    </div>
  );
}
