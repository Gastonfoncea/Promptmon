"use client";

import { useAccount } from "wagmi";
import { type LeaderboardEntry, useLeaderboard } from "@/hooks/useLeaderboard";

function short(addr: string): string {
  if (addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const MEDAL = ["🥇", "🥈", "🥉"];

function Row({
  entry,
  rank,
  isMine,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMine: boolean;
}) {
  const top = rank < 3;
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
        isMine
          ? "border-[#836EF9] bg-[#836EF9]/10"
          : top
            ? "border-white/15 bg-white/5"
            : "border-white/5 bg-transparent"
      }`}
    >
      <div className="w-8 text-center text-lg font-black text-white/70">
        {MEDAL[rank] ?? rank + 1}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-white">
          PromptMon #{entry.id.toString()}
          {isMine && (
            <span className="ml-2 text-[10px] font-normal text-[#a78bfa]">
              (tuya)
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/40">
          lvl {entry.level} · dueño {short(entry.owner)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black text-[#a78bfa]">{entry.wins}</div>
        <div className="text-[10px] uppercase tracking-wide text-white/40">
          wins
        </div>
      </div>
    </div>
  );
}

export function Leaderboard() {
  const { address } = useAccount();
  const { entries, loading } = useLeaderboard();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Leaderboard
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          en vivo
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-white/5 px-4 py-3"
            >
              <div className="h-5 w-5 animate-pulse rounded bg-white/10" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                <div className="h-2 w-20 animate-pulse rounded bg-white/5" />
              </div>
              <div className="h-6 w-8 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">
          Todavía no hay criaturas. Minteá la primera 👾
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <Row
              key={entry.id.toString()}
              entry={entry}
              rank={i}
              isMine={entry.owner.toLowerCase() === address?.toLowerCase()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
