"use client";

import { Leaderboard } from "@/components/Leaderboard";
import { TopBar } from "@/components/TopBar";

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <Leaderboard />
    </main>
  );
}
