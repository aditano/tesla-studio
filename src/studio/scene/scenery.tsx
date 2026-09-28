import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Backdrop, SceneryKind } from "./backdrops";
import { ForestScenery } from "./forest";
import { CityScenery, DesertScenery, MarsScenery } from "./landscapes";
import { disposeHorizon, makeHorizon, type RidgeLayer } from "./horizon";

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
      intensity={11}
      distance={36}
      decay={1.4}
      color="#f7f3df"
      map={map}
      castShadow={false}
    />
  );
}

/** Alpha ramp for the road shoulders: opaque at the deck, clear outward. */
function useShoulderFade() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const grad = ctx.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#8a8a8a");
    grad.addColorStop(1, "#000000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 4);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.NoColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/** Road deck height. Contact shadows are drawn just above it. */
export const ROAD_Y = 0.024;

function Road({
  color,
  width,
  dash,
}: {
  color: string;
  width: number;
  dash?: string;
}) {
  const shoulder = useShoulderFade();
  return (
    <group>
      {/* Terrain flattens to y 0.012 under the car; sit clearly above it so
          the two surfaces never z-fight into stair-stepped stripes. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ROAD_Y, 0]} receiveShadow>
        <planeGeometry args={[width, 80]} />
        <meshStandardMaterial
          color={color}
          roughness={0.88}
          metalness={0.04}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {/* Soft gravel shoulders so the deck fades into the terrain instead of
          ending in a hard diagonal edge. */}
      {shoulder &&
        [-1, 1].map((side) => (
          <mesh
            key={side}
            rotation={[-Math.PI / 2, 0, side < 0 ? Math.PI : 0]}
            position={[side * (width / 2 + 0.7), ROAD_Y - 0.002, 0]}
            renderOrder={1}
          >
            <planeGeometry args={[1.4, 80]} />
            <meshStandardMaterial
              color={color}
              alphaMap={shoulder}
              transparent
              depthWrite={false}
              roughness={0.95}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
          </mesh>
        ))}
      {dash &&
        Array.from({ length: 14 }, (_, i) => (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, ROAD_Y + 0.004, -28 + i * 4]}
          >
            <planeGeometry args={[0.12, 1.4]} />
            <meshBasicMaterial color={dash} />
          </mesh>
        ))}
    </group>
  );
}

/** Distant silhouettes per scene, far to near. Radii sit inside the sky dome
 * (180 m) and beyond the playable floor, so they only ever frame the car. */
const HORIZONS: Partial<Record<SceneryKind, { haze: string; layers: RidgeLayer[] }>> = {
  mars: {
    haze: "#c08066",
    layers: [
      { radius: 150, height: [6, 26], color: "#8a4a38", haze: 0.62, profile: "jagged", seed: 3 },
      { radius: 110, height: [3, 13], color: "#7a3a2a", haze: 0.42, profile: "rolling", seed: 7 },
      { radius: 78, height: [1.2, 5.5], color: "#6a2e22", haze: 0.24, profile: "mesa", seed: 11 },
    ],
  },
  desert: {
    haze: "#ecd6b0",
    layers: [
      { radius: 160, height: [8, 22], color: "#b08868", haze: 0.66, profile: "jagged", seed: 5 },
      { radius: 120, height: [4, 14], color: "#b27e52", haze: 0.44, profile: "mesa", seed: 13 },
      { radius: 86, height: [0.8, 3.6], color: "#c9a06a", haze: 0.28, profile: "rolling", seed: 17 },
    ],
  },
  forest: {
    haze: "#5f7a66",
    layers: [
      { radius: 150, height: [10, 30], color: "#3c5a4c", haze: 0.58, profile: "jagged", seed: 19 },
      { radius: 96, height: [7, 13], color: "#1c3326", haze: 0.3, profile: "rolling", seed: 23 },
    ],
  },
  city: {
    haze: "#1c1a3a",
    layers: [
      { radius: 150, height: [4, 44], color: "#0c0e1c", haze: 0.35, profile: "skyline", seed: 29 },
      { radius: 105, height: [2, 26], color: "#07080f", haze: 0.18, profile: "skyline", seed: 31 },
    ],
  },
};

function Horizon({ kind }: { kind: SceneryKind }) {
  const spec = HORIZONS[kind];
  const group = useMemo(
    () => (spec ? makeHorizon(spec.layers, spec.haze) : null),
    [spec],
  );
  useEffect(() => () => {
    if (group) disposeHorizon(group);
  }, [group]);
  return group ? <primitive object={group} /> : null;
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
      <Horizon kind={backdrop.scenery} />
      <Scenery kind={backdrop.scenery} />
    </group>
  );
}
