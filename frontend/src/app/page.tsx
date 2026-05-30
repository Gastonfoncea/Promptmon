"use client";

import { useState } from "react";
import { CreatureCanvas } from "@/components/CreatureCanvas";
import { PromptInput } from "@/components/PromptInput";
import { WalletStatus } from "@/components/WalletStatus";

export default function Home() {
  // glbUrl de la última criatura generada. Por ahora solo lo mostramos;
  // PRO-16 lo va a tomar para montar <CreatureModel glbUrl={...}/> en el canvas.
  const [glbUrl, setGlbUrl] = useState<string | null>(null);

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
    // TODO(PRO-16): pasar glbUrl a <CreatureModel> dentro de <CreatureCanvas>.
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Prompt<span className="text-[#836EF9]">Mon</span>
        </h1>
        <WalletStatus />
      </header>

      <section className="relative flex-1">
        {/* Canvas R3F (PRO-19). Dev2 monta las criaturas acá dentro (PRO-16/17). */}
        <CreatureCanvas />

        {/* Overlay: input de prompt (PRO-15) abajo, centrado sobre el canvas. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-6">
          {glbUrl && (
            <a
              href={glbUrl}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto rounded-full bg-white/10 px-4 py-1 text-xs text-white/70 hover:bg-white/20"
            >
              ✅ criatura generada — ver .glb
            </a>
          )}
          <div className="pointer-events-auto w-full max-w-xl">
            <PromptInput onGenerate={handleGenerate} />
          </div>
        </div>
      </section>
    </main>
  );
}
