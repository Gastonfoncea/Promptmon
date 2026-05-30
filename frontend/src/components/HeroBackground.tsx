"use client";

import { Icosahedron, MeshDistortMaterial, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import { type Mesh } from "three";

/** Núcleo de energía: un icosaedro distorsionado que "respira" y gira — la
 *  criatura antes de nacer. Self-contained (no depende de ningún .glb externo). */
function EnergyCore() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.25;
    ref.current.rotation.x += delta * 0.06;
  });
  return (
    <Icosahedron ref={ref} args={[1.7, 12]} position={[2.2, 0.2, 0]}>
      <MeshDistortMaterial
        color="#836EF9"
        emissive="#6d4be0"
        emissiveIntensity={0.7}
        distort={0.42}
        speed={1.6}
        roughness={0.15}
        metalness={0.2}
      />
    </Icosahedron>
  );
}

/** Fondo 3D atmosférico del hero de la landing (PRO-landing). */
export function HeroBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#08060f"]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 3, 3]} intensity={3} color="#a78bfa" />
      <pointLight position={[-3, -2, 2]} intensity={1.5} color="#5b3fd6" />
      <Stars radius={70} depth={50} count={3500} factor={4} fade speed={0.4} />
      <EnergyCore />
      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
