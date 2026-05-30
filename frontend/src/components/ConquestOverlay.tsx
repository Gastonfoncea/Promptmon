"use client";

import { Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box3, type Group, type Mesh, type PointLight } from "three";
import { usePublicClient } from "wagmi";
import { type Abi } from "viem";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import type { BattleOutcome } from "@/hooks/useArena";
import type { Creature } from "@/hooks/useMintCreature";
import { CONQUEST, conquestFrame } from "@/lib/conquest";
import { computeFitTransform } from "@/lib/fitModel";

const abi = PROMPTMON_ABI as Abi;

function setOpacity(object: Group, opacity: number) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      m.transparent = true;
      m.opacity = opacity;
    }
  });
}

/** Carga un .glb y lo normaliza (centrado + escala uniforme). */
function useNormalizedGlb(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    const transform = computeFitTransform({
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    });
    return { object, transform };
  }, [scene]);
}

const WINNER_X = 1.9;
const LOSER_START_X = -1.9;

/** Escena 3D: el perdedor viaja, gira y es absorbido por el ganador. */
function ConquestScene({
  winnerGlb,
  loserGlb,
}: {
  winnerGlb: string;
  loserGlb: string;
}) {
  const winner = useNormalizedGlb(winnerGlb);
  const loser = useNormalizedGlb(loserGlb);
  const winnerWrap = useRef<Group>(null);
  const loserWrap = useRef<Group>(null);
  const glow = useRef<PointLight>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta * 1000;
    const f = conquestFrame(clock.current);

    if (loserWrap.current) {
      loserWrap.current.position.x =
        LOSER_START_X + (WINNER_X - LOSER_START_X) * f.loserProgress;
      loserWrap.current.position.y = Math.sin(f.loserProgress * Math.PI) * 0.7; // arco
      loserWrap.current.scale.setScalar(Math.max(0.001, f.loserScale));
      loserWrap.current.rotation.y += delta * 7; // gira desesperado
      setOpacity(loser.object, f.loserOpacity);
    }
    if (winnerWrap.current) {
      winnerWrap.current.scale.setScalar(1 + f.winnerGlow * 0.18); // pulso al absorber
      winnerWrap.current.rotation.y += delta * 0.5;
    }
    if (glow.current) glow.current.intensity = f.winnerGlow * 14;
  });

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <group ref={winnerWrap} position={[WINNER_X, 0, 0]}>
        <pointLight ref={glow} color="#836EF9" intensity={0} distance={12} />
        <group scale={winner.transform.scale} position={winner.transform.position}>
          <primitive object={winner.object} />
        </group>
      </group>
      <group ref={loserWrap} position={[LOSER_START_X, 0, 0]}>
        <group scale={loser.transform.scale} position={loser.transform.position}>
          <primitive object={loser.object} />
        </group>
      </group>
    </>
  );
}

/** Sirena sintetizada con Web Audio (sin assets): barrido de frecuencia + envelope. */
function playSiren() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.5);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.75);
    osc.onended = () => ctx.close();
  } catch {
    // sin audio disponible → seguimos sin sonido
  }
}

interface Props {
  outcome: BattleOutcome;
  onClose: () => void;
}

/**
 * Overlay de CONQUISTA a pantalla completa (PRO-23, WOW #2).
 * Lee ambas criaturas, anima la absorción, dispara flash + sirena + el contador
 * de victorias del ganador. Pensado para que se filme bien (pitch 45-75s).
 */
export function ConquestOverlay({ outcome, onClose }: Props) {
  const publicClient = usePublicClient();
  const [winner, setWinner] = useState<Creature | null>(null);
  const [loser, setLoser] = useState<Creature | null>(null);
  const [impact, setImpact] = useState(false);

  // Cargar ambas criaturas.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!publicClient) return;
      const [w, l] = await Promise.all([
        publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "getCreature",
          args: [outcome.winnerId],
        }) as Promise<Creature>,
        publicClient.readContract({
          address: PROMPTMON_ADDRESS,
          abi,
          functionName: "getCreature",
          args: [outcome.loserId],
        }) as Promise<Creature>,
      ]);
      if (alive) {
        setWinner(w);
        setLoser(l);
      }
    })();
    return () => {
      alive = false;
    };
  }, [publicClient, outcome]);

  // Disparar impacto (flash + sirena + contador) sincronizado con la absorción.
  useEffect(() => {
    if (!winner || !loser) return;
    const t = setTimeout(() => {
      setImpact(true);
      playSiren();
    }, CONQUEST.travelEndMs);
    return () => clearTimeout(t);
  }, [winner, loser]);

  if (!winner || !loser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white/70">
        Resolviendo batalla…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0614]">
      {/* Flash violeta en el impacto */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[#836EF9] transition-opacity duration-300"
        style={{ opacity: impact ? 0.55 : 0, animation: impact ? "none" : undefined }}
      />

      <div className="relative z-20 flex items-center justify-between px-6 py-4">
        <span className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-widest text-[#a78bfa]">
          ⚔️ Conquista
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
        >
          cerrar
        </button>
      </div>

      <div className="relative flex-1">
        <Canvas camera={{ position: [0, 0.5, 6], fov: 45 }} dpr={[1, 2]}>
          <color attach="background" args={["#0a0614"]} />
          <Stars radius={50} depth={30} count={1800} factor={3} fade speed={1} />
          <ConquestScene winnerGlb={winner.glb} loserGlb={loser.glb} />
          <EffectComposer>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>

        {/* Contador de victorias del ganador */}
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-1">
          <div
            className={`font-[family-name:var(--font-display)] text-7xl font-bold text-white transition-transform duration-300 ${
              impact ? "scale-125 text-[#a78bfa]" : "scale-100"
            }`}
          >
            {impact ? winner.wins : Math.max(0, winner.wins - 1)} WINS
          </div>
          <div className="text-sm text-white/60">
            #{outcome.winnerId.toString()} se quedó con #
            {outcome.loserId.toString()}
          </div>
        </div>
      </div>
    </div>
  );
}
