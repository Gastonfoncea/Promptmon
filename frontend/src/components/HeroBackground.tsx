"use client";

import { Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import { type Group } from "three";

/** Campo de estrellas que DERIVA de fondo (rotación lenta + twinkle). */
function Starfield() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.025;
      ref.current.rotation.x += delta * 0.008;
    }
  });
  return (
    <group ref={ref}>
      <Stars radius={80} depth={60} count={4500} factor={4} fade speed={1.2} />
    </group>
  );
}

/** Fondo 3D del hero: solo estrellas en movimiento + bloom. */
export function HeroBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#08060f"]} />
      <Starfield />
      <EffectComposer>
        <Bloom
          intensity={1}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
