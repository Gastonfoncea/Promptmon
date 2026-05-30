"use client";

import { OrbitControls, Stage, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, type ReactNode } from "react";

/**
 * Escena 3D base de PromptMon (PRO-19) + polish visual (PRO-25).
 *
 * `effects` activa el "modo pochoclero": campo de estrellas (galaxia) de fondo
 * y bloom violeta Monad. Se deja OPCIONAL y apagado por defecto para no
 * sobrecargar la GPU en las miniaturas de la arena (un canvas por card).
 */
export function CreatureCanvas({
  children,
  effects = false,
}: {
  children?: ReactNode;
  effects?: boolean;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      className="h-full w-full"
    >
      <color attach="background" args={["#0a0614" /* violeta Monad casi negro */]} />

      {effects && (
        <Stars
          radius={60}
          depth={40}
          count={2500}
          factor={3}
          saturation={0}
          fade
          speed={0.6}
        />
      )}

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

      {effects && (
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </Canvas>
  );
}
