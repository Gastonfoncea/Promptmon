"use client";

import { Stars, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box3, type Group, type Mesh, type PointLight } from "three";
import { type Abi } from "viem";
import { usePublicClient } from "wagmi";
import { PROMPTMON_ABI, PROMPTMON_ADDRESS } from "@/contract";
import type { BattleOutcome } from "@/hooks/useArena";
import type { Creature } from "@/hooks/useMintCreature";
import {
  BATTLE,
  battleFrame,
  colorFor,
  LOSER_HOLD_X,
  VOLLEYS,
  WINNER_HOLD_X,
} from "@/lib/battle";
import { computeFitTransform } from "@/lib/fitModel";
import { proxiedModelUrl } from "@/lib/modelUrl";
import { playSiren } from "@/lib/sfx";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { PowerBlast } from "./PowerBlast";

const abi = PROMPTMON_ABI as Abi;
const SIZE = 1.7; // agranda los modelos para llenar la pantalla

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

function useNormalizedGlb(url: string) {
  const { scene } = useGLTF(proxiedModelUrl(url));
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

const POWER_Y = 0.3;

function BattleScene({
  winnerGlb,
  loserGlb,
  winnerColor,
  loserColor,
}: {
  winnerGlb: string;
  loserGlb: string;
  winnerColor: string;
  loserColor: string;
}) {
  const winner = useNormalizedGlb(winnerGlb);
  const loser = useNormalizedGlb(loserGlb);
  const winnerWrap = useRef<Group>(null);
  const loserWrap = useRef<Group>(null);
  const glow = useRef<PointLight>(null);
  const clock = useRef(0);

  useFrame((_, delta) => {
    clock.current += delta * 1000;
    const f = battleFrame(clock.current);

    if (winnerWrap.current) {
      winnerWrap.current.position.set(f.winner.x, f.winner.y, 0);
      winnerWrap.current.scale.setScalar(f.winner.scale);
      winnerWrap.current.rotation.z = f.winner.tilt;
      winnerWrap.current.rotation.y += delta * 0.3;
    }
    if (loserWrap.current) {
      loserWrap.current.position.set(f.loser.x, f.loser.y, 0);
      loserWrap.current.scale.setScalar(Math.max(0.001, f.loser.scale));
      loserWrap.current.rotation.z = f.loser.tilt;
      loserWrap.current.rotation.y += delta * (f.phase === "absorb" ? 6 : 0.3);
      setOpacity(loser.object, f.loser.opacity);
    }
    if (glow.current) glow.current.intensity = f.winner.glow * 16;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 4]} intensity={1} />
      {/* Auras de color por criatura */}
      <pointLight position={[WINNER_HOLD_X, 0, 2.5]} color={winnerColor} intensity={3} distance={7} />
      <pointLight position={[LOSER_HOLD_X, 0, 2.5]} color={loserColor} intensity={3} distance={7} />

      <group ref={winnerWrap}>
        <pointLight ref={glow} color={winnerColor} intensity={0} distance={12} />
        <group scale={winner.transform.scale * SIZE} position={winner.transform.position}>
          <primitive object={winner.object} />
        </group>
      </group>
      <group ref={loserWrap}>
        <group scale={loser.transform.scale * SIZE} position={loser.transform.position}>
          <primitive object={loser.object} />
        </group>
      </group>

      {/* Poderes que cruzan durante el clash */}
      {VOLLEYS.map((v, i) => {
        const isLoser = v.by === "loser";
        const from: [number, number, number] = isLoser
          ? [LOSER_HOLD_X, POWER_Y, 0]
          : [WINNER_HOLD_X, POWER_Y, 0];
        const to: [number, number, number] = isLoser
          ? [WINNER_HOLD_X, POWER_Y, 0]
          : [LOSER_HOLD_X, POWER_Y, 0];
        return (
          <PowerBlast
            key={i}
            startMs={v.atMs}
            from={from}
            to={to}
            color={isLoser ? loserColor : winnerColor}
          />
        );
      })}
    </>
  );
}

/** Punto de color al lado del nombre de cada criatura. */
function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

interface Props {
  outcome: BattleOutcome;
  onClose: () => void;
}

/**
 * Secuencia de batalla cinematográfica a pantalla completa (PRO-32).
 * face-off → clash (poderes) → golpe final → conquista → resultado.
 * El ganador ya lo decidió el contrato; esto es la dramatización.
 */
export function BattleCinematic({ outcome, onClose }: Props) {
  const publicClient = usePublicClient();
  const [winner, setWinner] = useState<Creature | null>(null);
  const [loser, setLoser] = useState<Creature | null>(null);
  const [impact, setImpact] = useState(false);

  const winnerColor = colorFor(outcome.winnerId);
  const loserColor = colorFor(outcome.loserId);

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

  // Impacto (flash + sirena + contador) sincronizado con la absorción.
  useEffect(() => {
    if (!winner || !loser) return;
    const t = setTimeout(() => {
      setImpact(true);
      playSiren();
    }, BATTLE.absorbEndMs);
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
    <div className="fixed inset-0 z-50 bg-[#0a0614]">
      {/* Canvas a PANTALLA COMPLETA (absoluto, no depende del flex layout) */}
      <Canvas
        camera={{ position: [0, 0.4, 5.5], fov: 50 }}
        dpr={[1, 2]}
        style={{ position: "absolute", inset: 0 }}
      >
        <color attach="background" args={["#0a0614"]} />
        <Stars radius={50} depth={30} count={2000} factor={3} fade speed={1} />
        <ModelErrorBoundary>
          <BattleScene
            winnerGlb={winner.glb}
            loserGlb={loser.glb}
            winnerColor={winnerColor}
            loserColor={loserColor}
          />
        </ModelErrorBoundary>
        <EffectComposer>
          <Bloom
            intensity={1.3}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* Flash en el impacto */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{ backgroundColor: winnerColor, opacity: impact ? 0.5 : 0 }}
      />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-white/70">
            <ColorDot color={loserColor} /> #{outcome.loserId.toString()}
          </span>
          <span className="font-[family-name:var(--font-display)] font-bold uppercase tracking-widest text-[#a78bfa]">
            ⚔️ Batalla
          </span>
          <span className="flex items-center gap-1.5 text-white/70">
            #{outcome.winnerId.toString()} <ColorDot color={winnerColor} />
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/10"
        >
          cerrar
        </button>
      </div>

      {/* Contador de victorias del ganador, revelado en el impacto */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-1">
        <div
          className={`font-[family-name:var(--font-display)] text-7xl font-bold text-white transition-all duration-300 ${
            impact ? "scale-125 text-[#a78bfa] opacity-100" : "scale-100 opacity-0"
          }`}
        >
          {winner.wins} WINS
        </div>
        {impact && (
          <div className="text-sm text-white/60">
            #{outcome.winnerId.toString()} se quedó con #
            {outcome.loserId.toString()}
          </div>
        )}
      </div>
    </div>
  );
}
