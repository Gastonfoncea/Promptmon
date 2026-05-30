"use client";

import { useAccount } from "wagmi";
import { type MintStep, useMintCreature } from "@/hooks/useMintCreature";
import { CreatureStats } from "./CreatureStats";

const STEP_LABEL: Record<MintStep, string> = {
  idle: "Mintear criatura",
  faucet: "Pidiendo mUSDC…",
  approve: "Aprobando pago…",
  minting: "Acuñando NFT…",
  reading: "Leyendo stats…",
  done: "¡Minteada!",
  error: "Reintentar mint",
};

/** Pasos visibles del flujo de mint, para el stepper. */
const STEPS: { key: MintStep; label: string }[] = [
  { key: "faucet", label: "Fondos" },
  { key: "approve", label: "Aprobar" },
  { key: "minting", label: "Acuñar" },
];
const STEP_ORDER: MintStep[] = ["faucet", "approve", "minting", "reading", "done"];

function Stepper({ step }: { step: MintStep }) {
  const current = STEP_ORDER.indexOf(step);
  return (
    <div className="flex w-full items-center gap-1.5">
      {STEPS.map((s, i) => {
        const done = current > STEP_ORDER.indexOf(s.key);
        const active = step === s.key;
        return (
          <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1 w-full rounded-full transition ${
                done || active ? "bg-[#836EF9]" : "bg-white/10"
              }`}
            />
            <span
              className={`text-[10px] ${active ? "text-[#a78bfa]" : "text-white/40"}`}
            >
              {i + 1}. {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MintPanel({ glbUrl }: { glbUrl: string }) {
  const { isConnected } = useAccount();
  const { mint, step, error, result } = useMintCreature();

  const isBusy =
    step === "faucet" ||
    step === "approve" ||
    step === "minting" ||
    step === "reading";

  // Ya minteada: tarjeta de stats (el momento del pitch).
  if (step === "done" && result) {
    const { creature, tokenId } = result;
    return (
      <div className="w-full rounded-2xl border border-[#836EF9]/40 bg-[#1a1033]/80 p-4 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-[family-name:var(--font-display)] text-sm font-bold text-white">
            PromptMon #{tokenId.toString()}
          </span>
          <span className="text-xs text-white/50">
            lvl {creature.level} · {creature.wins} wins
          </span>
        </div>
        <CreatureStats creature={creature} showTotal />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
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

      {isBusy && <Stepper step={step} />}

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
