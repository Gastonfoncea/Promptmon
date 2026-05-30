"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3 } from "three";
import { computeFitTransform } from "@/lib/fitModel";

/**
 * Carga un modelo .glb desde una URL y lo muestra centrado y a escala uniforme (PRO-16).
 *
 * La iluminación, el entorno y la auto-rotación los aporta <CreatureCanvas> (PRO-19)
 * vía <Stage> + <OrbitControls autoRotate>. Acá solo nos ocupamos de cargar el GLB
 * y normalizar tamaño/posición para que cualquier glbUrl quede bien encuadrado.
 *
 * Se monta dentro del <Canvas> (es children de CreatureCanvas), que ya envuelve
 * en <Suspense>, así que useGLTF puede suspender mientras descarga.
 */
export function CreatureModel({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl);

  const { object, transform } = useMemo(() => {
    // Clonamos para no mutar la escena cacheada por useGLTF (mismo glbUrl reutilizado).
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    const transform = computeFitTransform({
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    });
    return { object, transform };
  }, [scene]);

  return (
    <group scale={transform.scale} position={transform.position}>
      <primitive object={object} />
    </group>
  );
}
