"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Box3, type Group, type Mesh, type PointLight } from "three";
import { computeFitTransform } from "@/lib/fitModel";
import { proxiedModelUrl } from "@/lib/modelUrl";
import {
  spawnState,
  SPAWN_DURATION_MS,
  SPAWN_GLOW_MAX,
} from "@/lib/spawnAnimation";

/** Setea la opacidad (y el modo transparente) de todos los materiales del objeto. */
function setOpacity(object: Group, opacity: number, transparent: boolean) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      material.transparent = transparent;
      material.opacity = opacity;
    }
  });
}

/**
 * Carga un modelo .glb, lo normaliza (centrado + escala uniforme, PRO-16) y lo
 * hace NACER con una animación de materialización (PRO-17, WOW #1):
 * escala desde 0 con rebote + fade-in de opacidad + glow violeta Monad que crece
 * y se desvanece en ~2s.
 *
 * La animación reinicia por criatura: montar con `key={glbUrl}` desde el padre.
 * Luz base / entorno / auto-rotación los aporta <CreatureCanvas> (PRO-19).
 */
export function CreatureModel({ glbUrl }: { glbUrl: string }) {
  // Ruteamos por /api/model para esquivar el CORS del CDN de Tripo.
  const { scene } = useGLTF(proxiedModelUrl(glbUrl));

  const spawnRef = useRef<Group>(null);
  const glowRef = useRef<PointLight>(null);
  const elapsedMs = useRef(0);
  const finished = useRef(false);

  const { object, transform } = useMemo(() => {
    // Clonamos para no mutar la escena cacheada por useGLTF (mismo glbUrl reutilizado).
    const object = scene.clone(true);
    setOpacity(object, 0, true); // arranca invisible para el fade-in
    const box = new Box3().setFromObject(object);
    const transform = computeFitTransform({
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    });
    return { object, transform };
  }, [scene]);

  useFrame((_, delta) => {
    if (finished.current) return;

    elapsedMs.current += delta * 1000;
    const s = spawnState(elapsedMs.current, SPAWN_DURATION_MS);

    spawnRef.current?.scale.setScalar(s.scale);
    if (glowRef.current) glowRef.current.intensity = s.glow * SPAWN_GLOW_MAX;
    setOpacity(object, s.opacity, true);

    if (s.done) {
      // Estado final limpio: full opacidad, sin transparencia (evita artefactos
      // de orden de dibujo) y glow apagado. Y dejamos de trabajar por frame.
      spawnRef.current?.scale.setScalar(1);
      if (glowRef.current) glowRef.current.intensity = 0;
      setOpacity(object, 1, false);
      finished.current = true;
    }
  });

  return (
    // Group exterior: anima la escala de nacimiento (0 → 1 con rebote).
    <group ref={spawnRef} scale={0}>
      {/* Glow violeta Monad que "respira" durante el nacimiento. */}
      <pointLight ref={glowRef} color="#836EF9" intensity={0} distance={8} />
      {/* Group interior: normalización fija (centrado + escala uniforme). */}
      <group scale={transform.scale} position={transform.position}>
        <primitive object={object} />
      </group>
    </group>
  );
}
