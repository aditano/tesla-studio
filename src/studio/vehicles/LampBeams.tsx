import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { backdropById } from "../scene/backdrops";
import { useStudio } from "../store";

type Face = {
  position: [number, number, number];
  size: [number, number];
  bar?: boolean;
};

/** Lamp faces sit on the nose. Authored and imported meshes often bury the
 * emitter inside a housing, so these planes are the visible lamp. */
const FACES: Record<string, Face[]> = {
  "model-3": [
    { position: [-0.58, 0.66, -2.4], size: [0.46, 0.11] },
    { position: [0.58, 0.66, -2.4], size: [0.46, 0.11] },
  ],
  "model-y": [
    { position: [0, 0.84, -2.3], size: [1.72, 0.04], bar: true },
    { position: [-0.7, 0.62, -2.27], size: [0.32, 0.08] },
    { position: [0.7, 0.62, -2.27], size: [0.32, 0.08] },
  ],
  "model-3-heritage": [
    { position: [-0.62, 0.64, -2.34], size: [0.38, 0.12] },
    { position: [0.62, 0.64, -2.34], size: [0.38, 0.12] },
  ],
  "model-s-heritage": [
    { position: [-0.72, 0.66, -2.47], size: [0.42, 0.13] },
    { position: [0.72, 0.66, -2.47], size: [0.42, 0.13] },
  ],
  cybertruck: [
    { position: [0, 1.01, -2.875], size: [1.96, 0.045], bar: true },
    { position: [-0.78, 0.58, -2.868], size: [0.34, 0.09] },
    { position: [0.78, 0.58, -2.868], size: [0.34, 0.09] },
  ],
  cybercab: [
    { position: [0, 0.72, -2.085], size: [1.62, 0.05], bar: true },
    { position: [-0.62, 0.66, -2.09], size: [0.24, 0.055] },
    { position: [0.62, 0.66, -2.09], size: [0.24, 0.055] },
  ],
};

function usePoolMap() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 256);
    const vertical = ctx.createLinearGradient(0, 0, 0, 256);
    vertical.addColorStop(0, "rgba(255,255,255,0.95)");
    vertical.addColorStop(0.18, "rgba(226,236,255,0.55)");
    vertical.addColorStop(0.55, "rgba(190,210,235,0.16)");
    vertical.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, 128, 256);
    const edge = ctx.createLinearGradient(0, 0, 128, 0);
    edge.addColorStop(0, "rgba(0,0,0,1)");
    edge.addColorStop(0.18, "rgba(0,0,0,0)");
    edge.addColorStop(0.82, "rgba(0,0,0,0)");
    edge.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, 128, 256);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.NoColorSpace;
    map.flipY = false;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Spot({
  position,
  intensity,
}: {
  position: [number, number, number];
  intensity: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const aim: [number, number, number] = [
    position[0] * 0.22,
    0.03,
    position[2] - 7.2,
  ];
  useFrame(() => {
    const spot = light.current;
    const marker = target.current;
    if (!spot || !marker) return;
    spot.target = marker;
    marker.updateWorldMatrix(true, false);
  });
  return (
    <>
      <spotLight
        ref={light}
        position={position}
        angle={0.42}
        penumbra={0.72}
        distance={18}
        decay={2}
        intensity={intensity}
        color="#eef4ff"
        castShadow={false}
      />
      <pointLight
        position={[position[0], position[1], position[2] - 0.05]}
        intensity={intensity * 0.006}
        distance={2.4}
        decay={2}
        color="#f7fbff"
      />
      <object3D ref={target} position={aim} />
    </>
  );
}

function Pool({
  origin,
  opacity,
  map,
}: {
  origin: [number, number, number];
  opacity: number;
  map: THREE.Texture;
}) {
  const length = 6.6;
  const width = 1.45;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[origin[0] * 0.72, 0.02, origin[2] - length / 2]}
      renderOrder={6}
    >
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial
        map={map}
        color="#e7f1ff"
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function LampFace({
  face,
  lit,
}: {
  face: Face;
  lit: boolean;
}) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const pulse = useStudio((s) => s.demoFeature === "lightbar" && !!face.bar);
  useFrame(({ clock }) => {
    const material = glow.current;
    if (!material) return;
    const base = lit ? (face.bar ? 6.5 : 7.5) : 0;
    material.emissiveIntensity = pulse ? base + Math.sin(clock.elapsedTime * 3) * 1.4 : base;
  });
  return (
    <group position={face.position} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[face.size[0] + 0.04, face.size[1] + 0.028]} />
        <meshStandardMaterial color="#0c1014" roughness={0.46} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={face.size} />
        <meshStandardMaterial
          ref={glow}
          color={lit ? "#f4f8ff" : "#6d7c8c"}
          emissive={face.bar ? "#f7fbff" : "#eef5ff"}
          emissiveIntensity={lit ? 7 : 0}
          roughness={0.28}
          metalness={0.04}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[face.size[0] + 0.012, face.size[1] + 0.01]} />
        <meshPhysicalMaterial
          color={lit ? "#d5e4f4" : "#24303a"}
          emissive={lit ? "#c9ddf2" : "#000000"}
          emissiveIntensity={lit ? 0.85 : 0}
          transparent
          opacity={lit ? 0.42 : 0.55}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function LampBeams({ model, on }: { model: string; on: boolean }) {
  const environment = useStudio((s) => s.environment);
  const lightBar = useStudio((s) => s.lightBarOn);
  const backdrop = backdropById(environment);
  const pool = usePoolMap();
  const faces = FACES[model] ?? FACES["model-3"];
  const projectors = faces.filter((face) => !face.bar);
  const beams = projectors.length ? projectors : faces;
  return (
    <group>
      {faces.map((face, index) => (
        <LampFace
          key={`${face.position.join(",")}-${index}`}
          face={face}
          lit={face.bar ? on && lightBar : on}
        />
      ))}
      {beams.map((face, index) => (
        <Spot
          key={`spot-${index}`}
          position={[face.position[0], face.position[1], face.position[2] - 0.02]}
          intensity={on ? backdrop.beam : 0}
        />
      ))}
      {beams.map((face, index) => (
        <Pool
          key={`pool-${index}`}
          origin={face.position}
          opacity={on ? backdrop.pool : 0}
          map={pool}
        />
      ))}
    </group>
  );
}
