"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

export type PodiumEntry = {
  id: string;
  name: string;
  note: string | null;
  photo: string | null;
  votes: number;
};

const CONFETTI_COLORS = ["#1b4de4", "#4d7bf5", "#8fb0ff", "#ffffff", "#ffd166"];
const CONFETTI_COUNT = 220;

/** Continuous confetti rain — an InstancedMesh so 220 flakes cost one draw
 *  call. Particles loop (respawn above frame) for as long as this is mounted. */
function Confetti() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, () => ({
        x: (Math.random() - 0.5) * 9,
        y: Math.random() * 8 + 3,
        z: (Math.random() - 0.5) * 5,
        vy: 0.9 + Math.random() * 1.1,
        vx: (Math.random() - 0.5) * 0.6,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 4,
        scale: 0.09 + Math.random() * 0.08,
      })),
    []
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    particles.forEach((_, i) => {
      color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.05); // clamp — a stalled tab shouldn't teleport particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.vy * dt;
      p.x += p.vx * dt;
      p.rotX += p.rotSpeed * dt;
      p.rotY += p.rotSpeed * dt * 0.7;
      if (p.y < -3) {
        p.y = 8 + Math.random() * 3;
        p.x = (Math.random() - 0.5) * 9;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rotX, p.rotY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, CONFETTI_COUNT]}>
      <planeGeometry args={[0.14, 0.22]} />
      <meshStandardMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/** Camera slowly orbits, dollying in over the first ~1.6s for a dramatic
 *  "punch in" the moment the podium appears. */
function CameraRig() {
  const { camera } = useThree();
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    const settle = Math.min(1, elapsed.current / 1.6);
    const radius = THREE.MathUtils.lerp(9, 6.5, settle);
    const angle = elapsed.current * 0.08;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = THREE.MathUtils.lerp(3.2, 2.1, settle);
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}

/** Intensity ramps up from 0 on mount instead of snapping on. Aimed at the
 *  default target (world origin), which sits right at the 1st-place block. */
function SpotlightRig() {
  const light = useRef<THREE.SpotLight>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (light.current) light.current.intensity = THREE.MathUtils.lerp(0, 55, Math.min(1, elapsed.current));
  });
  return <spotLight ref={light} position={[0, 7, 2]} angle={0.55} penumbra={0.6} color="#eaf0ff" castShadow />;
}

function PodiumBlock({
  position,
  height,
  width,
  color,
  entry,
  place,
}: {
  position: [number, number, number];
  height: number;
  width: number;
  color: string;
  entry: PodiumEntry;
  place: 1 | 2 | 3;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
      </mesh>

      <Html position={[0, height * 0.5, width / 2 + 0.05]} center distanceFactor={8}>
        <div
          className="font-mono font-black select-none pointer-events-none"
          style={{ fontSize: place === 1 ? 34 : 26, color: "rgba(255,255,255,.85)" }}
        >
          {place}
        </div>
      </Html>

      <Html position={[0, height + 1.05, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-1.5 select-none pointer-events-none" style={{ width: 150 }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white/90 overflow-hidden flex-none"
            style={{ background: "linear-gradient(135deg,#3d6df0,#1230a8)", boxShadow: "0 6px 24px -6px rgba(27,77,228,.7)" }}
          >
            {entry.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              entry.name.slice(0, 1)
            )}
          </div>
          <div className="text-white font-bold text-[15px] text-center leading-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,.6)" }}>
            {entry.name}
          </div>
          {entry.note && <div className="text-white/70 text-[11px] font-mono text-center">{entry.note}</div>}
          <div className="text-[13px] font-mono font-bold" style={{ color: place === 1 ? "#ffd166" : "#cdd8ff" }}>
            {entry.votes} suara
          </div>
        </div>
      </Html>
    </group>
  );
}

/**
 * 3D winner podium — mounted only for a clear (non-tied) final-stage result,
 * only when WebGL is actually available (see has-webgl.ts / WebglErrorBoundary
 * at the call site). `places` is rank 1..3 by vote count; fewer than 3
 * candidates just renders fewer blocks.
 */
export default function PodiumScene({ places }: { places: PodiumEntry[] }) {
  const [first, second, third] = places;

  return (
    <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={["#050b24"]} />
      <fog attach="fog" args={["#050b24", 8, 18]} />
      <PerspectiveCamera makeDefault fov={42} position={[0, 3.2, 9]} />
      <CameraRig />
      <ambientLight intensity={0.35} color="#3d5cd8" />
      <SpotlightRig />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a1338" metalness={0.2} roughness={0.9} />
      </mesh>

      {first && <PodiumBlock position={[0, 0, 0]} height={1.5} width={1.7} color="#1b4de4" entry={first} place={1} />}
      {second && <PodiumBlock position={[-2.1, 0, 0.4]} height={1.05} width={1.5} color="#2c4590" entry={second} place={2} />}
      {third && <PodiumBlock position={[2.1, 0, 0.4]} height={0.75} width={1.5} color="#232d54" entry={third} place={3} />}

      <Confetti />
    </Canvas>
  );
}
