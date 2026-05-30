import type { Creature } from "@/hooks/useMintCreature";

/** Stats con nombre, color e identidad — no cajitas grises genéricas. */
const STATS = [
  { key: "atk", label: "ATK", color: "#f87171" }, // ataque
  { key: "def", label: "DEF", color: "#60a5fa" }, // defensa
  { key: "hp", label: "HP", color: "#4ade80" }, // vida
  { key: "spd", label: "SPD", color: "#fbbf24" }, // velocidad
] as const;

/** Tope por stat para escalar las barras (los stats van ~10..49, pool total 100). */
const MAX_PER_STAT = 50;

/**
 * Stats de una criatura como barras (ATK/DEF/HP/SPD). Las barras muestran el
 * reparto del pool fijo de 100; con `showTotal` se explicita el hook del pitch.
 */
export function CreatureStats({
  creature,
  showTotal = false,
}: {
  creature: Creature;
  showTotal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {STATS.map((s) => {
        const value = creature[s.key];
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-7 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {s.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (value / MAX_PER_STAT) * 100)}%`,
                  backgroundColor: s.color,
                }}
              />
            </div>
            <span className="w-5 text-right text-xs font-bold tabular-nums text-white">
              {value}
            </span>
          </div>
        );
      })}
      {showTotal && (
        <p className="mt-1 text-[10px] leading-tight text-white/35">
          Σ 100 de poder · repartido on-chain, no lo elegís vos
        </p>
      )}
    </div>
  );
}
