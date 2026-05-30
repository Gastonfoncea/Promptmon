"use client";

import Link from "next/link";
import { Leaderboard } from "@/components/Leaderboard";
import { WalletStatus } from "@/components/WalletStatus";

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            Prompt<span className="text-[#836EF9]">Mon</span>
          </Link>
          <Link
            href="/arena"
            className="text-sm font-medium text-white/60 transition hover:text-[#a78bfa]"
          >
            Arena
          </Link>
          <span className="text-sm font-medium text-[#a78bfa]">/ leaderboard</span>
        </div>
        <WalletStatus />
      </header>

      <Leaderboard />
    </main>
  );
}
