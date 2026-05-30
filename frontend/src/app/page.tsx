import Link from "next/link";
import { HeroBackground } from "@/components/HeroBackground";

const TICKER = [
  "DIBUJÁS CON PALABRAS",
  "STATS QUE NO ELEGÍS",
  "PvP — ROBÁS EL NFT",
  "400ms · PARALLEL EVM",
  "AI ON-CHAIN",
];

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative z-10 overflow-hidden border-t border-white/10 bg-black/40 py-3 backdrop-blur">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-white/45"
          >
            {t}
            <span className="text-[#836EF9]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[#08060f] text-white">
      {/* Fondo 3D: estrellas en movimiento + núcleo de energía + bloom */}
      <HeroBackground />

      {/* Grano sutil */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Scrim radial para legibilidad del texto centrado */}
      <div
        className="pointer-events-none absolute inset-0 z-[6]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(8,6,15,0.7), transparent 70%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <span className="font-[family-name:var(--font-poster)] text-2xl tracking-tight">
          PROMPT<span className="text-[#836EF9]">MON</span>
        </span>
        <span className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          Monad Testnet · Live
        </span>
      </nav>

      {/* Hero — todo centrado */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p
          className="animate-rise font-mono text-xs uppercase tracking-[0.3em] text-[#a78bfa]"
          style={{ animationDelay: "0.05s" }}
        >
          IA · on-chain · 400ms en Monad
        </p>

        <h1
          className="animate-rise mt-5 font-[family-name:var(--font-poster)] text-6xl uppercase leading-[0.92] sm:text-7xl md:text-8xl"
          style={{ animationDelay: "0.15s" }}
        >
          Una batalla
          <br />
          de <span className="text-[#836EF9]">prompts</span>.
        </h1>

        <p
          className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-white/60"
          style={{ animationDelay: "0.3s" }}
        >
          Escribí un prompt, nace tu criatura en 3D y peleás on-chain. El ganador
          se queda con el NFT del perdedor —{" "}
          <span className="font-semibold text-white/85">para siempre.</span>
        </p>

        <div
          className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: "0.45s" }}
        >
          <Link
            href="/create"
            className="group rounded-xl bg-[#836EF9] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#6f5be0]"
          >
            Crea tu personaje{" "}
            <span className="inline-block transition group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            href="/leaderboard"
            className="rounded-xl border border-white/15 px-8 py-4 text-base font-medium text-white/80 transition hover:bg-white/5"
          >
            Ver leaderboard
          </Link>
        </div>
      </div>

      <Ticker />
    </main>
  );
}
