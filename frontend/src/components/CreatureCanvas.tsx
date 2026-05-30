"use client";

import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";

/**
 * Escena 3D base de PromptMon (PRO-19).
 *
 * Por ahora el canvas está VACÍO (criterio de aceptación de PRO-19).
 * Dev2 monta acá adentro las criaturas:
 *   - PRO-16: <CreatureModel glbUrl={...} /> como children
 *   - PRO-17: la animación de nacimiento
 *
 * Trae listo: luces vía <Stage>, auto-rotación y controles de órbita.
 */
export function CreatureCanvas({ children }: { children?: ReactNode }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      className="h-full w-full"
    >
      <color attach="background" args={["#0e0a1f" /* violeta Monad oscuro */]} />
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5} adjustCamera={false}>
          {children}
        </Stage>
      </Suspense>
      <OrbitControls
        autoRotate
        autoRotateSpeed={1.2}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
      />
    </Canvas>
  );
}
