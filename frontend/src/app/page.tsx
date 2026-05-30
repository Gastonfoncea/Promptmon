"use client";

import { useState } from "react";
import { CreatureCanvas } from "@/components/CreatureCanvas";
import { CreatureModel } from "@/components/CreatureModel";
import { PromptInput } from "@/components/PromptInput";
import { WalletStatus } from "@/components/WalletStatus";
import { MintFlow } from "@/components/MintFlow";
import { Arena } from "@/components/Arena";
import { Leaderboard } from "@/components/Leaderboard";

type Tab = "mint" | "arena" | "leaderboard";

export default function Home() {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mint");

  async function handleGenerate(prompt: string) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = (await res.json()) as { glbUrl?: string; error?: string };
    if (!res.ok || !data.glbUrl) {
      throw new Error(data.error ?? "Falló la generación");
    }
    setGlbUrl(data.glbUrl);
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Prompt<span className="text-[#836EF9]">Mon</span>
        </h1>
        <WalletStatus />
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {/* Columna izquierda: canvas 3D + prompt */}
        <section className="relative min-h-[50vh] overflow-hidden rounded-2xl border border-white/10">
          <CreatureCanvas>
            {glbUrl && <CreatureModel key={glbUrl} glbUrl={glbUrl} />}
          </CreatureCanvas>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4">
            <div className="pointer-events-auto w-full max-w-xl">
              <PromptInput onGenerate={handleGenerate} />
            </div>
          </div>
        </section>

        {/* Columna derecha: flujos on-chain con tabs */}
        <section className="flex flex-col gap-3">
          <nav className="flex gap-2">
            {(["mint", "arena", "leaderboard"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                  tab === t
                    ? "bg-[#836EF9] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          {tab === "mint" && <MintFlow glbUrl={glbUrl} />}
          {tab === "arena" && <Arena />}
          {tab === "leaderboard" && <Leaderboard />}
        </section>
      </div>
    </main>
  );
}
