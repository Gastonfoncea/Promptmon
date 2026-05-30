"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { BattleCinematic } from "./BattleCinematic";
import { ChallengeCard } from "./ChallengeCard";
import { MyCreatureCard } from "./MyCreatureCard";
import {
  useArenaActions,
  useMyCreatures,
  useOpenChallenges,
} from "@/hooks/useArena";
import { playImpact } from "@/lib/sfx";

export function ArenaPanel() {
  const { address, isConnected } = useAccount();
  const { creatures, refresh: refreshMine } = useMyCreatures();
  const { challenges, refresh: refreshChallenges } = useOpenChallenges();

  // Una criatura propia seleccionada, usada para abrir desafío o aceptar.
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  const actions = useArenaActions(() => {
    refreshMine();
    refreshChallenges();
  });

  // Ids de mis criaturas que ya están en un desafío abierto (lockeadas).
  const lockedIds = useMemo(() => {
    const set = new Set<string>();
    for (const ch of challenges) {
      if (ch.challenger.toLowerCase() === address?.toLowerCase()) {
        set.add(ch.creatureId.toString());
      }
    }
    return set;
  }, [challenges, address]);

  if (!isConnected) {
    return (
      <p className="py-12 text-center text-sm text-white/50">
        Conectá la wallet para entrar a la arena.
      </p>
    );
  }

  const selected = creatures.find((c) => c.id === selectedId) ?? null;
  const selectedLocked = selected
    ? lockedIds.has(selected.id.toString())
    : false;
  const canUseSelected = Boolean(selected) && !selectedLocked;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      {/* Batalla cinematográfica a pantalla completa */}
      {actions.lastBattle && (
        <BattleCinematic
          outcome={actions.lastBattle}
          onClose={actions.clearBattle}
        />
      )}

      {/* Guía rápida */}
      <p className="text-sm text-white/50">
        <span className="font-semibold text-white/80">1.</span> Elegí una criatura
        tuya · <span className="font-semibold text-white/80">2.</span> abrí un
        desafío o aceptá uno abierto.
      </p>

      {/* Tus criaturas */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Tus criaturas ({creatures.length})
        </h2>

        {creatures.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 p-6">
            <p className="text-sm text-white/50">
              Todavía no tenés criaturas. Creá la primera para entrar a la arena.
            </p>
            <Link
              href="/create"
              className="rounded-xl bg-[#836EF9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5be0]"
            >
              Crea tu personaje →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {creatures.map((c) => (
              <MyCreatureCard
                key={c.id.toString()}
                creature={c}
                selected={selectedId === c.id}
                locked={lockedIds.has(c.id.toString())}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}

        {creatures.length > 0 && (
          <button
            type="button"
            disabled={!canUseSelected || actions.busy === "create"}
            onClick={() => selected && actions.createChallenge(selected.id)}
            className="mt-4 rounded-xl bg-[#836EF9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actions.busy === "create"
              ? "Creando desafío…"
              : !selected
                ? "Elegí una criatura para desafiar"
                : selectedLocked
                  ? "Esa criatura ya está en un desafío"
                  : `Abrir desafío con #${selected.id.toString()}`}
          </button>
        )}
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
                  canAccept={canUseSelected}
                  busy={
                    actions.busy === `accept:${ch.cid}` ||
                    actions.busy === `cancel:${ch.cid}`
                  }
                  onAccept={() => {
                    if (!canUseSelected || !selected) return;
                    playImpact();
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
