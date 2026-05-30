"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Mesh } from "three";
import { clamp01 } from "@/lib/battle";

interface Props {
  /** Cuándo dispara (ms desde el inicio de la batalla). */
  startMs: number;
  durationMs?: number;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}

/**
 * Ráfaga de poder: una esfera emisiva (toneMapped=false → explota con el bloom)
 * que viaja del atacante al defensor en un arco y pulsa de tamaño. Invisible
 * fuera de su ventana de tiempo. Reloj propio sincronizado al montar con la escena.
 */
export function PowerBlast({ startMs, durationMs = 550, from, to, color }: Props) {
  const ref = useRef<Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta * 1000;
    const mesh = ref.current;
    if (!mesh) return;

    const local = elapsed.current - startMs;
    if (local < 0 || local > durationMs) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const p = clamp01(local / durationMs);
    mesh.position.set(
      from[0] + (to[0] - from[0]) * p,
      from[1] + (to[1] - from[1]) * p + Math.sin(p * Math.PI) * 0.4,
      from[2] + (to[2] - from[2]) * p,
    );
    // Crece al salir, achica al impactar.
    mesh.scale.setScalar(0.18 + Math.sin(p * Math.PI) * 0.14);
  });

  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={3}
        toneMapped={false}
      />
    </mesh>
  );
}
