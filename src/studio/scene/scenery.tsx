import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Backdrop, SceneryKind } from "./backdrops";

function useSky(top: string, bottom: string) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [top, bottom]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function SkyDome({ backdrop }: { backdrop: Backdrop }) {
  const map = useSky(backdrop.skyTop, backdrop.skyBottom);
  return (
    <mesh>
      <sphereGeometry args={[180, 24, 16]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function Dunes({
  color,
  count,
  seed,
}: {
  color: string;
  count: number;
  seed: number;
}) {
  const dunes = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const n = Math.sin(seed * 12.3 + i * 4.1);
      const m = Math.cos(seed * 3.7 + i * 2.2);
      list.push({
        position: [n * 16 + (i % 2 === 0 ? -10 : 8), 0, m * 14 + (i - count / 2) * 3.2] as [
          number,
          number,
          number,
        ],
        scale: [3.2 + (i % 3), 0.55 + (i % 4) * 0.18, 2.4 + (i % 2)] as [
          number,
          number,
          number,
        ],
      });
    }
    return list;
  }, [count, seed]);
  return (
    <group>
      {dunes.map((dune, i) => (
        <mesh key={i} position={dune.position} scale={dune.scale} receiveShadow>
          <sphereGeometry args={[1, 18, 10]} />
          <meshStandardMaterial color={color} roughness={0.96} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function Trees() {
  const spots = useMemo(() => {
    const list = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -18 + i * 2.15;
      list.push({
        x: side * (4.6 + (i % 3) * 0.85),
        z,
        h: 3.2 + (i % 4) * 0.55,
        r: 0.9 + (i % 3) * 0.25,
      });
    }
    return list;
  }, []);
  return (
    <group>
      {spots.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.h * 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, tree.h * 0.45, 6]} />
            <meshStandardMaterial color="#3a2a1c" roughness={0.9} />
          </mesh>
          <mesh position={[0, tree.h * 0.62, 0]} castShadow>
            <coneGeometry args={[tree.r, tree.h * 0.72, 7]} />
            <meshStandardMaterial color={i % 2 ? "#1e4630" : "#2f5a3c"} roughness={0.86} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Road({
  color,
  width,
  dash,
}: {
  color: string;
  width: number;
  dash?: string;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[width, 80]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
      </mesh>
      {dash &&
        Array.from({ length: 14 }, (_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, -28 + i * 4]}
          >
            <planeGeometry args={[0.12, 1.4]} />
            <meshBasicMaterial color={dash} />
          </mesh>
        ))}
    </group>
  );
}

function City() {
  const blocks = useMemo(() => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -22 + (i % 7) * 6.5;
      const h = 4 + ((i * 3) % 8);
      list.push({
        x: side * (7.5 + (i % 3) * 1.4),
        z,
        h,
        w: 2.2 + (i % 3) * 0.6,
      });
    }
    return list;
  }, []);
  return (
    <group>
      {blocks.map((block, i) => (
        <group key={i} position={[block.x, block.h / 2, block.z]}>
          <mesh castShadow>
            <boxGeometry args={[block.w, block.h, 2.4]} />
            <meshStandardMaterial color="#141820" roughness={0.8} metalness={0.15} />
          </mesh>
          {Array.from({ length: 4 }, (_, row) => (
            <mesh key={row} position={[0, -block.h / 2 + 1.2 + row * (block.h / 5), 1.22]}>
              <planeGeometry args={[block.w * 0.72, 0.28]} />
              <meshStandardMaterial
                color="#ffd2a8"
                emissive="#ffc48a"
                emissiveIntensity={i % 3 === 0 ? 1.4 : 0.45}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Scenery({ kind }: { kind: SceneryKind }) {
  switch (kind) {
    case "none":
      return null;
    case "mars":
      return (
        <>
          <Dunes color="#9a4632" count={7} seed={1} />
          <mesh position={[18, 6.5, -24]}>
            <sphereGeometry args={[2.2, 16, 12]} />
            <meshBasicMaterial color="#ffd0b0" />
          </mesh>
        </>
      );
    case "forest":
      return (
        <>
          <Trees />
          <Road color="#2a2c28" width={3.6} dash="#d8d2c4" />
        </>
      );
    case "city":
      return (
        <>
          <City />
          <Road color="#1a1c24" width={4.2} />
        </>
      );
    case "desert":
      return (
        <>
          <Dunes color="#d2b27a" count={6} seed={2} />
          <Road color="#6a6258" width={3.8} dash="#f2ead8" />
          <mesh position={[-16, 7.2, -20]}>
            <sphereGeometry args={[1.6, 16, 12]} />
            <meshBasicMaterial color="#fff6df" />
          </mesh>
        </>
      );
    default: {
      const uncovered: never = kind;
      return uncovered;
    }
  }
}

export function BackdropScenery({
  backdrop,
}: {
  backdrop: Backdrop;
}) {
  if (backdrop.scenery === "none") return null;
  return (
    <group>
      <SkyDome backdrop={backdrop} />
      <Scenery kind={backdrop.scenery} />
    </group>
  );
}
