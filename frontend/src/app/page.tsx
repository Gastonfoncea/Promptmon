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
  // Duplicado para loop continuo sin cortes.
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
      {/* Fondo 3D: núcleo de energía + estrellas + bloom */}
      <HeroBackground />

      {/* Grano sutil para textura */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
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

      {/* Hero */}
      <div className="relative z-10 flex flex-1 items-center px-8 md:px-16">
        <div className="max-w-3xl">
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
            Pokémon que
            <br />
            dibujás con
            <br />
            <span className="text-[#836EF9]">palabras.</span>
          </h1>

          <p
            className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-white/55"
            style={{ animationDelay: "0.3s" }}
          >
            <span className="font-semibold text-white/80">
              Y te los roban para siempre.
            </span>{" "}
            Escribí un prompt, la IA esculpe tu criatura en 3D y la acuñás como
            NFT. En la arena, el ganador se queda con tu bicho.
          </p>

          <div
            className="animate-rise mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "0.45s" }}
          >
            <Link
              href="/create"
              className="group rounded-xl bg-[#836EF9] px-7 py-3.5 text-base font-semibold text-white transition hover:bg-[#6f5be0]"
            >
              Lanzar app{" "}
              <span className="inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-xl border border-white/15 px-7 py-3.5 text-base font-medium text-white/80 transition hover:bg-white/5"
            >
              Ver leaderboard
            </Link>
          </div>
        </div>
      </div>

      <Ticker />
    </main>
  );
}
