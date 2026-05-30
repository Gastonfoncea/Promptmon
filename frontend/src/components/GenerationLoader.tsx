"use client";

/** Fase narrada según el progreso real de Tripo. */
function phaseLabel(progress: number): string {
  if (progress < 12) return "Analizando tu prompt…";
  if (progress < 45) return "Esculpiendo la forma…";
  if (progress < 75) return "Texturizando…";
  if (progress < 99) return "Dando los últimos toques…";
  return "Naciendo…";
}

/**
 * Estado de carga de la generación (UX). Cubre el canvas mientras Tripo trabaja
 * (~60-90s) con una animación violeta + fase narrada + barra de progreso REAL.
 */
export function GenerationLoader({ progress }: { progress: number }) {
  const pct = Math.round(progress);
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 bg-[#0a0614]/70 backdrop-blur-sm">
      {/* Núcleo de energía pulsante */}
      <div className="relative h-32 w-32">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#836EF9]/30" />
        <span
          className="absolute inset-3 animate-spin rounded-full border-2 border-transparent border-t-[#836EF9] border-r-[#a78bfa]"
          style={{ animationDuration: "1.4s" }}
        />
        <span className="absolute inset-8 animate-pulse rounded-full bg-[#836EF9] blur-md" />
        <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-white">
          {pct}%
        </span>
      </div>

      <div className="flex w-72 flex-col items-center gap-3">
        <p className="font-[family-name:var(--font-display)] text-sm font-medium tracking-wide text-white/80">
          {phaseLabel(progress)}
        </p>
        {/* Barra de progreso real */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#836EF9] to-[#c4b5fd] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-white/35">
          la IA está creando tu criatura — ~1 minuto
        </p>
      </div>
    </div>
  );
}
