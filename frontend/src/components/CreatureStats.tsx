import type { Creature } from "@/hooks/useMintCreature";

const ROWS = [
  ["ATK", "atk"],
  ["DEF", "def"],
  ["HP", "hp"],
  ["SPD", "spd"],
] as const;

/** Grilla compacta de stats ATK/DEF/HP/SPD. Reutilizada en mint y arena. */
export function CreatureStats({ creature }: { creature: Creature }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {ROWS.map(([label, key]) => (
        <div key={key} className="rounded-md bg-white/5 px-1.5 py-1 text-center">
          <div className="text-[9px] uppercase tracking-wide text-white/40">
            {label}
          </div>
          <div className="text-sm font-bold text-[#a78bfa]">{creature[key]}</div>
        </div>
      ))}
    </div>
  );
}
