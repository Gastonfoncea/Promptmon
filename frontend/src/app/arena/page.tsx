"use client";

import Link from "next/link";
import { ArenaPanel } from "@/components/ArenaPanel";
import { WalletStatus } from "@/components/WalletStatus";

export default function ArenaPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            Prompt<span className="text-[#836EF9]">Mon</span>
          </Link>
          <span className="text-sm font-medium text-[#a78bfa]">/ arena</span>
        </div>
        <WalletStatus />
      </header>

      <ArenaPanel />
    </main>
  );
}
