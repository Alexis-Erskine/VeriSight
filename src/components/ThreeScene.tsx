"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type * as THREE from "three";
import { MathUtils } from "three";

function TorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = MathUtils.lerp(
        meshRef.current.rotation.x,
        clock.getElapsedTime() * 0.15,
        0.05
      );
      meshRef.current.rotation.y = MathUtils.lerp(
        meshRef.current.rotation.y,
        clock.getElapsedTime() * 0.1,
        0.05
      );
      meshRef.current.position.z = Math.sin(clock.getElapsedTime() * 0.2) * 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={meshRef} scale={1.8}>
        <torusKnotGeometry args={[1, 0.3, 128, 16]} />
        <MeshDistortMaterial
          color="#4f46e5"
          emissive="#6366f1"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.8}
          distort={0.15}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function Particles({ count = 800 }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.02;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#818cf8"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={2}
        depthWrite={false}
      />
    </points>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#818cf8" />
      <TorusKnot />
      <Particles count={1000} />
    </Canvas>
  );
}
