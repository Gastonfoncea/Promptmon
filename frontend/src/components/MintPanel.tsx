"use client";

import { useAccount } from "wagmi";
import { type MintStep, useMintCreature } from "@/hooks/useMintCreature";

/** Texto de cada paso del flujo, para el botón mientras procesa. */
const STEP_LABEL: Record<MintStep, string> = {
  idle: "Mintear criatura",
  faucet: "Pidiendo mUSDC…",
  approve: "Aprobando pago…",
  minting: "Acuñando NFT…",
  reading: "Leyendo stats…",
  done: "¡Minteada!",
  error: "Reintentar mint",
};

const STAT_ROWS = [
  ["ATK", "atk"],
  ["DEF", "def"],
  ["HP", "hp"],
  ["SPD", "spd"],
] as const;

export function MintPanel({ glbUrl }: { glbUrl: string }) {
  const { isConnected } = useAccount();
  const { mint, step, error, result } = useMintCreature();

  const isBusy =
    step === "faucet" ||
    step === "approve" ||
    step === "minting" ||
    step === "reading";

  // Ya minteada: mostramos la tarjeta de stats (lo que se ve en el pitch).
  if (step === "done" && result) {
    const { creature, tokenId } = result;
    return (
      <div className="w-full rounded-2xl border border-[#836EF9]/40 bg-[#1a1033]/80 p-4 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-white">
            PromptMon #{tokenId.toString()}
          </span>
          <span className="text-xs text-white/50">
            lvl {creature.level} · {creature.wins} wins
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STAT_ROWS.map(([label, key]) => (
            <div
              key={key}
              className="rounded-lg bg-white/5 px-2 py-2 text-center"
            >
              <div className="text-[10px] uppercase tracking-wide text-white/40">
                {label}
              </div>
              <div className="text-lg font-bold text-[#a78bfa]">
                {creature[key]}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-white/40">
          stats que ni vos elegís — salen del hash on-chain
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => mint(glbUrl)}
        disabled={!isConnected || isBusy}
        className="w-full rounded-xl bg-[#836EF9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6f5be0] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy && (
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle" />
        )}
        {isConnected ? STEP_LABEL[step] : "Conectá la wallet para mintear"}
      </button>

      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
