"use client";

import { ArenaPanel } from "@/components/ArenaPanel";
import { TopBar } from "@/components/TopBar";

export default function ArenaPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <ArenaPanel />
    </main>
  );
}
