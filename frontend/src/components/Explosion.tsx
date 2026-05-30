"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Mesh, type MeshStandardMaterial } from "three";

interface Props {
  /** Cuándo detona (ms desde el inicio de la batalla). */
  atMs: number;
  position: [number, number, number];
  color: string;
  durationMs?: number;
}

/**
 * Onda expansiva de impacto: una esfera wireframe emisiva que crece y se
 * desvanece. toneMapped=false → explota con el bloom. Invisible fuera de su
 * ventana. Reloj propio sincronizado al montar.
 */
export function Explosion({ atMs, position, color, durationMs = 450 }: Props) {
  const ref = useRef<Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += delta * 1000;
    const mesh = ref.current;
    if (!mesh) return;

    const local = elapsed.current - atMs;
    if (local < 0 || local > durationMs) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const p = local / durationMs;
    mesh.scale.setScalar(0.15 + p * 1.8); // crece
    const mat = mesh.material as MeshStandardMaterial;
    mat.opacity = 1 - p; // se desvanece
  });

  return (
    <mesh ref={ref} position={position} visible={false}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={4}
        transparent
        opacity={1}
        toneMapped={false}
        wireframe
      />
    </mesh>
  );
}
