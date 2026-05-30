"use client";

import { useLeaderboard } from "@/hooks/usePromptMon";

/**
 * Leaderboard funcional (sin pulir): lee todas las criaturas y las ordena por
 * wins. Refresca manual por ahora; los eventos en tiempo real son PRO-24.
 */
export function Leaderboard() {
  const { rows, total, refetch, isLoading } = useLeaderboard();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">
          Leaderboard ({total} criaturas)
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
        >
          Refrescar
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-white/40">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/40">Todavía no hay criaturas.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-white/40">
              <th className="py-1">#</th>
              <th>ID</th>
              <th>Lvl</th>
              <th>Wins</th>
              <th>ATK</th>
              <th>DEF</th>
              <th>HP</th>
              <th>SPD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rank) => (
              <tr key={row.id} className="border-t border-white/5 text-white/80">
                <td className="py-1">{rank + 1}</td>
                <td>{row.id}</td>
                <td>{Number(row.creature.level)}</td>
                <td className="font-semibold text-emerald-400">
                  {Number(row.creature.wins)}
                </td>
                <td>{Number(row.creature.atk)}</td>
                <td>{Number(row.creature.def)}</td>
                <td>{Number(row.creature.hp)}</td>
                <td>{Number(row.creature.spd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
