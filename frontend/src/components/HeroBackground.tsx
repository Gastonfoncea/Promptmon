"use client";

import { Icosahedron, MeshDistortMaterial, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import { type Group, type Mesh } from "three";

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

/** Núcleo de energía centrado y empujado atrás, como halo detrás del texto. */
function EnergyCore() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.22;
    ref.current.rotation.x += delta * 0.05;
  });
  return (
    <Icosahedron ref={ref} args={[2.1, 12]} position={[0, -0.2, -1.6]}>
      <MeshDistortMaterial
        color="#836EF9"
        emissive="#6d4be0"
        emissiveIntensity={0.45}
        distort={0.4}
        speed={1.5}
        roughness={0.2}
        metalness={0.2}
      />
    </Icosahedron>
  );
}

/** Fondo 3D atmosférico del hero. */
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
      <Starfield />
      <EnergyCore />
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
