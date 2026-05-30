"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { AllocatePanel } from "./AllocatePanel";
import { BattleCinematic } from "./BattleCinematic";
import { ChallengeCard } from "./ChallengeCard";
import { MatchupBar } from "./MatchupBar";
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

  // Tu criatura elegida y el desafío rival elegido (el matchup de la barra).
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [targetCid, setTargetCid] = useState<bigint | null>(null);

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

  // El rival: el desafío elegido, siempre que sea de otro (no peleás contra vos).
  const opponent =
    challenges.find(
      (ch) =>
        ch.cid === targetCid &&
        ch.challenger.toLowerCase() !== address?.toLowerCase(),
    ) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      {/* Batalla cinematográfica a pantalla completa */}
      {actions.lastBattle && (
        <BattleCinematic
          outcome={actions.lastBattle}
          onClose={actions.clearBattle}
        />
      )}

      {/* Barra de matchup: el partido siempre a la vista */}
      <MatchupBar
        myCreature={selected}
        myLocked={selectedLocked}
        opponent={opponent}
        busyFight={
          opponent ? actions.busy === `accept:${opponent.cid}` : false
        }
        busyCreate={actions.busy === "create"}
        onFight={() => {
          if (!selected || !opponent || !canUseSelected) return;
          playImpact();
          actions.acceptChallenge(opponent.cid, selected.id);
        }}
        onCreate={() => {
          if (selected && canUseSelected) actions.createChallenge(selected.id);
        }}
      />

      {/* Tus criaturas */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Tus criaturas ({creatures.length}) — elegí una
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

        {/* Asignar puntos ganados al subir de nivel (criatura seleccionada) */}
        {selected && selected.unspent > 0 && (
          <AllocatePanel
            creature={selected}
            busy={actions.busy === `allocate:${selected.id}`}
            onAllocate={(atk, def, hp, spd) =>
              actions.allocate(selected.id, atk, def, hp, spd)
            }
          />
        )}
      </section>

      {/* Desafíos abiertos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Desafíos abiertos ({challenges.length}) — elegí un rival
        </h2>
        {challenges.length === 0 ? (
          <p className="text-sm text-white/40">
            No hay desafíos abiertos. Elegí una criatura y abrí el primero 👆
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
                  selected={ch.cid === targetCid}
                  busy={actions.busy === `cancel:${ch.cid}`}
                  onSelect={() => setTargetCid(ch.cid)}
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
