import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { backdropById } from "../scene/backdrops";
import { useStudio } from "../store";

/** Nose and projector positions in studio metres. Pools and beams hang off
 * these; the lamp faces themselves are the vehicle meshes. */
const LAMPS: Record<string, { bumper: number; x: number; y: number }> = {
  "model-3": { bumper: -2.36, x: 0.66, y: 0.64 },
  "model-y": { bumper: -2.4, x: 0.74, y: 0.64 },
  "model-3-heritage": { bumper: -2.345, x: 0.64, y: 0.64 },
  "model-s-heritage": { bumper: -2.485, x: 0.72, y: 0.66 },
  cybertruck: { bumper: -2.886, x: 0.78, y: 0.58 },
  cybercab: { bumper: -2.07, x: 0.58, y: 0.66 },
};

function usePoolMap() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 256);
    // Canvas top is UV v=0 after flipY=false, which lands at the bumper.
    const vertical = ctx.createLinearGradient(0, 0, 0, 256);
    vertical.addColorStop(0, "rgba(255,255,255,0.72)");
    vertical.addColorStop(0.05, "rgba(214,228,248,0.28)");
    vertical.addColorStop(0.14, "rgba(186,206,228,0.07)");
    vertical.addColorStop(0.28, "rgba(170,190,214,0)");
    vertical.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, 128, 256);
    const edge = ctx.createLinearGradient(0, 0, 128, 0);
    edge.addColorStop(0, "rgba(0,0,0,1)");
    edge.addColorStop(0.22, "rgba(0,0,0,0)");
    edge.addColorStop(0.78, "rgba(0,0,0,0)");
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
  aim,
  intensity,
}: {
  position: [number, number, number];
  aim: [number, number, number];
  intensity: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
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
        angle={0.58}
        penumbra={0.92}
        distance={14}
        decay={2}
        intensity={intensity}
        color="#e7eefc"
        castShadow={false}
      />
      <object3D ref={target} position={aim} />
    </>
  );
}

function Pool({
  x,
  bumper,
  opacity,
  map,
}: {
  x: number;
  bumper: number;
  opacity: number;
  map: THREE.Texture;
}) {
  const length = 8.4;
  const width = 1.2;
  // Rear edge sits just ahead of the bumper so the hot end is not under the nose.
  const centerZ = bumper - 0.04 - length / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, 0.016, centerZ]}
      renderOrder={6}
    >
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial
        map={map}
        color="#c9daf0"
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped
      />
    </mesh>
  );
}

export function LampBeams({ model, on }: { model: string; on: boolean }) {
  const environment = useStudio((s) => s.environment);
  const backdrop = backdropById(environment);
  const pool = usePoolMap();
  const lamp = LAMPS[model] ?? LAMPS["model-3"];
  const sides = [-1, 1] as const;
  return (
    <group>
      {sides.map((side) => (
        <Spot
          key={`spot-${side}`}
          position={[side * lamp.x, lamp.y, lamp.bumper - 0.05]}
          aim={[side * lamp.x * 0.18, 0.02, lamp.bumper - 9]}
          intensity={on ? backdrop.beam : 0}
        />
      ))}
      {sides.map((side) => (
        <Pool
          key={`pool-${side}`}
          x={side * lamp.x * 0.92}
          bumper={lamp.bumper}
          opacity={on ? backdrop.pool : 0}
          map={pool}
        />
      ))}
    </group>
  );
}
