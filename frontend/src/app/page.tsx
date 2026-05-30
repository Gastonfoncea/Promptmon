"use client";

import Link from "next/link";
import { useState } from "react";
import { CreatureCanvas } from "@/components/CreatureCanvas";
import { CreatureModel } from "@/components/CreatureModel";
import { MintPanel } from "@/components/MintPanel";
import { PromptInput } from "@/components/PromptInput";
import { WalletStatus } from "@/components/WalletStatus";
import { playWhoosh } from "@/lib/sfx";

export default function Home() {
  // glbUrl de la última criatura generada. Por ahora solo lo mostramos;
  // PRO-16 lo va a tomar para montar <CreatureModel glbUrl={...}/> en el canvas.
  const [glbUrl, setGlbUrl] = useState<string | null>(null);

  async function handleGenerate(prompt: string) {
    playWhoosh(); // SFX: arranca la generación (PRO-25)
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
    // TODO(PRO-16): pasar glbUrl a <CreatureModel> dentro de <CreatureCanvas>.
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
            Prompt<span className="text-[#836EF9]">Mon</span>
          </h1>
          <Link
            href="/arena"
            className="text-sm font-medium text-white/60 transition hover:text-[#a78bfa]"
          >
            Arena
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-white/60 transition hover:text-[#a78bfa]"
          >
            Leaderboard
          </Link>
        </div>
        <WalletStatus />
      </header>

      <section className="relative flex-1">
        {/* Canvas R3F (PRO-19). La criatura generada (PRO-16) se monta adentro. */}
        <CreatureCanvas effects>
          {/* key={glbUrl}: cada criatura nueva remonta y reinicia la animación de nacimiento (PRO-17). */}
          {glbUrl && <CreatureModel key={glbUrl} glbUrl={glbUrl} />}
        </CreatureCanvas>

        {/* Overlay: input de prompt (PRO-15) abajo, centrado sobre el canvas. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-6">
          {/* Una vez generada la criatura: panel de mint (PRO-21). */}
          {glbUrl && (
            <div className="pointer-events-auto w-full max-w-xl">
              <MintPanel glbUrl={glbUrl} />
            </div>
          )}
          <div className="pointer-events-auto w-full max-w-xl">
            <PromptInput onGenerate={handleGenerate} />
          </div>
        </div>
      </section>
    </main>
  );
}
