"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CreatureCanvas } from "@/components/CreatureCanvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Prompt<span className="text-[#836EF9]">Mon</span>
        </h1>
        <ConnectButton />
      </header>

      <section className="relative flex-1">
        {/* Canvas R3F vacío (PRO-19). Dev2 monta las criaturas acá dentro (PRO-16/17). */}
        <CreatureCanvas />
        <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/40">
          Canvas 3D listo — esperando criaturas 🐉
        </p>
      </section>
    </main>
  );
}
