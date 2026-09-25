import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Backdrop, SceneryKind } from "./backdrops";
import { ForestScenery } from "./forest";
import { CityScenery, DesertScenery, MarsScenery } from "./landscapes";

function hash(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function useSky(backdrop: Backdrop) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    const horizon =
      backdrop.id === "mars"
        ? "#e8b498"
        : backdrop.id === "desert"
          ? "#fff3d2"
          : backdrop.id === "forest"
            ? "#d5e4c4"
            : backdrop.id === "night-city"
              ? "#2c2458"
              : backdrop.skyBottom;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, backdrop.skyTop);
    grad.addColorStop(0.38, backdrop.skyTop);
    grad.addColorStop(0.62, horizon);
    grad.addColorStop(0.82, backdrop.skyBottom);
    grad.addColorStop(1, backdrop.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 512);
    if (backdrop.id === "night-city") {
      const rnd = hash(11);
      for (let i = 0; i < 140; i++) {
        const x = rnd() * 64;
        const y = rnd() * 300;
        const a = 0.28 + rnd() * 0.7;
        ctx.fillStyle = `rgba(236,242,255,${a})`;
        ctx.fillRect(x, y, rnd() > 0.85 ? 2 : 1, 1);
      }
    }
    if (backdrop.id === "mars" || backdrop.id === "desert") {
      const sunX = backdrop.id === "mars" ? 46 : 14;
      const sunY = backdrop.id === "mars" ? 168 : 108;
      const glow = ctx.createRadialGradient(sunX, sunY, 1, sunX, sunY, 70);
      glow.addColorStop(0, "rgba(255,248,230,0.95)");
      glow.addColorStop(0.18, "rgba(255,214,150,0.55)");
      glow.addColorStop(1, "rgba(255,214,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 512);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [backdrop]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function SkyDome({ backdrop }: { backdrop: Backdrop }) {
  const map = useSky(backdrop);
  return (
    <mesh>
      <sphereGeometry args={[180, 32, 20]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

function useLeafCookie() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    const rnd = hash(42);
    ctx.fillStyle = "#0c0c0c";
    for (let i = 0; i < 46; i++) {
      ctx.beginPath();
      ctx.ellipse(
        rnd() * 256,
        rnd() * 256,
        8 + rnd() * 28,
        4 + rnd() * 16,
        rnd() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.NoColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function DappledCanopy() {
  const map = useLeafCookie();
  return (
    <spotLight
      position={[3.4, 12.5, -2.6]}
      angle={0.62}
      penumbra={0.9}
      intensity={18}
      distance={36}
      decay={1.4}
      color="#f7f3df"
      map={map}
      castShadow={false}
    />
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
        <meshStandardMaterial color={color} roughness={0.88} metalness={0.04} />
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

function Scenery({ kind }: { kind: SceneryKind }) {
  switch (kind) {
    case "none":
      return null;
    case "mars":
      return <MarsScenery />;
    case "forest":
      return (
        <>
          <ForestScenery />
          <DappledCanopy />
          <Road color="#2a2c28" width={3.6} dash="#d8d2c4" />
        </>
      );
    case "city":
      return <CityScenery />;
    case "desert":
      return (
        <>
          <DesertScenery />
          <Road color="#6a6258" width={3.8} dash="#f2ead8" />
        </>
      );
    default: {
      const uncovered: never = kind;
      return uncovered;
    }
  }
}

export function BackdropScenery({ backdrop }: { backdrop: Backdrop }) {
  if (backdrop.scenery === "none") return null;
  return (
    <group>
      <SkyDome backdrop={backdrop} />
      <Scenery kind={backdrop.scenery} />
    </group>
  );
}
