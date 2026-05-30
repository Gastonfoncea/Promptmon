"use client";

import { useState } from "react";
import { CreatureCanvas } from "@/components/CreatureCanvas";
import { CreatureModel } from "@/components/CreatureModel";
import { GenerationLoader } from "@/components/GenerationLoader";
import { MintPanel } from "@/components/MintPanel";
import { ModelErrorBoundary } from "@/components/ModelErrorBoundary";
import { PromptInput } from "@/components/PromptInput";
import { TopBar } from "@/components/TopBar";
import { playWhoosh } from "@/lib/sfx";

export default function Home() {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  // progress null = no se está generando; 0-100 = en curso (muestra el loader).
  const [progress, setProgress] = useState<number | null>(null);

  async function handleGenerate(prompt: string) {
    playWhoosh();
    setGlbUrl(null);
    setProgress(0);
    try {
      const res = await fetch("/api/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok || !res.body) throw new Error("Falló la generación.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalUrl: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const msg = JSON.parse(trimmed) as {
            progress?: number;
            glbUrl?: string;
            error?: string;
          };
          if (msg.error) throw new Error(msg.error);
          if (typeof msg.progress === "number") setProgress(msg.progress);
          if (msg.glbUrl) finalUrl = msg.glbUrl;
        }
      }

      if (!finalUrl) throw new Error("No se recibió el modelo.");
      setProgress(100);
      setGlbUrl(finalUrl);
    } finally {
      setProgress(null);
    }
  }

  const isGenerating = progress !== null;

  return (
    <main className="flex h-dvh flex-col">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Escenario: la criatura, protagonista al centro */}
        <section className="relative flex-1">
          <CreatureCanvas effects>
            {glbUrl && (
              <ModelErrorBoundary key={glbUrl}>
                <CreatureModel glbUrl={glbUrl} />
              </ModelErrorBoundary>
            )}
          </CreatureCanvas>

          {progress !== null && <GenerationLoader progress={progress} />}

          {/* Hero / empty state: solo sin criatura y sin generación en curso */}
          {!glbUrl && !isGenerating && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white">
                Dibujá tu criatura con palabras
              </h2>
              <p className="max-w-sm text-sm text-white/45">
                La IA la esculpe en 3D y la acuñás como NFT en Monad. Sus stats
                salen del contrato — ni vos los elegís.
              </p>
            </div>
          )}
        </section>

        {/* Panel lateral: controles fuera del centro para no tapar la criatura */}
        <aside className="flex w-[360px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/5 bg-black/20 p-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              Tu prompt
            </h3>
            <PromptInput onGenerate={handleGenerate} />
          </div>

          {glbUrl && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                Acuñar en Monad
              </h3>
              <MintPanel glbUrl={glbUrl} />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
