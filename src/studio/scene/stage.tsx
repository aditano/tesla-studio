import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Backdrop } from "./backdrops";

/** Photo-studio set for the indoor backdrops: a curved cyclorama wall that
 * blends into the floor, with built-in light slots, and a ceiling rig of
 * softboxes.
 * The panels are what the paint and glass reflect, so they mirror the
 * Lightformers in the environment map. Everything is unlit, fog-free and
 * ignores raycasts, so it costs a handful of draw calls. */

type Look = {
  wash: string;
  wallTop: string;
  wallFoot: string;
  panel: string;
  panelGlow: number;
  strip: string;
  stripGlow: number;
};

function lookFor(backdrop: Backdrop): Look {
  const look = baseLook(backdrop);
  // The floor fades toward the fog colour at its rim; start the cove from
  // the same blend so floor and wall meet without a line.
  const foot = new THREE.Color(backdrop.floor).lerp(new THREE.Color(backdrop.fog), 0.35);
  return { ...look, wallFoot: `#${foot.getHexString()}` };
}

function baseLook(backdrop: Backdrop): Look {
  if (backdrop.day)
    return {
      wash: "#e6ebf0",
      wallTop: "#aeb6bf",
      wallFoot: backdrop.floor,
      panel: "#ffffff",
      panelGlow: 1.1,
      strip: "#f4f7fb",
      stripGlow: 0.9,
    };
  if (backdrop.night)
    return {
      wash: "#2a3446",
      wallTop: "#0b0e14",
      wallFoot: "#12161c",
      panel: "#c8d6ea",
      panelGlow: 0.55,
      strip: "#8fb0de",
      stripGlow: 1.25,
    };
  return {
    wash: "#48525e",
    wallTop: "#161b22",
    wallFoot: "#262c34",
    panel: "#f2f5fa",
    panelGlow: 0.85,
    strip: "#e8eef6",
    stripGlow: 1.05,
  };
}

/** Bearing opposite the overview camera, which sits at about (4.4, -5.5)
 * and looks through the car toward (-4.4, +5.5). The wall wash and the tower
 * ring are centred here so the default shot is the best-lit one. */
const CENTRE = Math.atan2(5.5, -4.4);

/** Uplight pool spacing around the wall (20 degrees), and the heights of the
 * glowing cove line and the high light rail, in metres. */
const SLOT = (Math.PI * 2) / 18;
const COVE_LINE = 0.32;
const RAIL = 4.4;

/** Quarter-pipe cove: a floor-level lip curving up into a vertical wall. */
function makeCyclorama(look: Look, radius: number) {
  const across = 240;
  const up = 160;
  const cove = 3.2;
  const height = 11;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const top = new THREE.Color(look.wallTop);
  const washColor = new THREE.Color(look.wash);
  const slotColor = new THREE.Color(look.strip);
  const foot = new THREE.Color(look.wallFoot);
  const c = new THREE.Color();
  for (let j = 0; j <= up; j += 1) {
    const v = j / up;
    let r: number;
    let y: number;
    if (v < 0.35) {
      const a = (v / 0.35) * (Math.PI / 2);
      r = radius - cove + Math.sin(a) * cove;
      y = cove - Math.cos(a) * cove;
    } else {
      r = radius;
      y = cove + ((v - 0.35) / 0.65) * (height - cove);
    }
    const row = foot.clone().lerp(top, Math.pow(v, 0.7));
    for (let i = 0; i <= across; i += 1) {
      // Lighting is horizontal so nothing on the wall ever lines up with the
      // roof: a glowing cove line where the floor turns up into the wall (a
      // classic cyclorama ground-row light), soft uplight pools above it and a
      // thin light rail high on the wall that frames the car.
      const bearing = (i / across) * Math.PI * 2;
      const offset = Math.abs(((((bearing - CENTRE) % SLOT) + SLOT * 1.5) % SLOT) - SLOT / 2);
      const pool = Math.exp(-Math.pow(offset / (SLOT * 0.34), 2));
      const uplight = pool * Math.exp(-Math.pow((y - 3) / 2.2, 2));
      c.copy(row).lerp(washColor, Math.min(1, 0.14 + uplight * 0.8));
      const glow = look.stripGlow * 2;
      const coveLine = Math.exp(-Math.pow((y - COVE_LINE) / 0.16, 2));
      const rail = Math.exp(-Math.pow((y - RAIL) / 0.07, 2));
      c.lerp(slotColor.clone().multiplyScalar(glow), Math.min(1, coveLine * 0.3 + rail));
      // Full surround: studio cameras look in every direction.
      positions.push(Math.cos(bearing) * r, y - 0.012, Math.sin(bearing) * r);
      colors.push(c.r, c.g, c.b);
      if (i < across && j < up) {
        const k = j * (across + 1) + i;
        indices.push(k, k + 1, k + across + 1, k + 1, k + across + 2, k + across + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Soft-edged panel texture, so softboxes read as diffused light. */
function makePanelTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const u = Math.min(x, size - 1 - x) / (size * 0.12);
      const v = Math.min(y, size - 1 - y) / (size * 0.12);
      const edge = Math.min(1, u) * Math.min(1, v);
      const i = (y * size + x) * 4;
      const n = 235 + Math.round(20 * edge);
      image.data[i] = image.data[i + 1] = image.data[i + 2] = n;
      image.data[i + 3] = Math.round(255 * edge);
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const noRaycast: THREE.Object3D["raycast"] = () => undefined;

/** Ceiling softboxes over the car: [x, y, z, width, depth]. They line up with
 * the overhead Lightformers so the roof reflection has a visible source. */
const SOFTBOXES: [number, number, number, number, number][] = [
  [0, 8.6, -0.4, 8, 2.2],
  [0, 8.5, 3.2, 6, 1.1],
  [0, 8.5, -4, 6, 1.1],
];

export function StudioStage({ backdrop }: { backdrop: Backdrop }) {
  const look = lookFor(backdrop);
  const wall = useMemo(
    // Close enough that the cove and slot feet show beside the car rather
    // than being hidden by the roof, and well inside the fog.
    () => makeCyclorama(look, 13),
    [look.wallTop, look.wallFoot, look.wash, look.strip, look.stripGlow],
  );
  const shared = useMemo(
    () => ({ texture: makePanelTexture(), plane: new THREE.PlaneGeometry(1, 1) }),
    [],
  );
  useEffect(() => () => wall.dispose(), [wall]);
  useEffect(
    () => () => {
      shared.texture.dispose();
      shared.plane.dispose();
    },
    [shared],
  );
  const glow = (color: string, gain: number) => (
    <meshBasicMaterial
      map={shared.texture}
      color={new THREE.Color(color).multiplyScalar(gain)}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      fog={false}
    />
  );
  return (
    <group>
      <mesh geometry={wall} renderOrder={-2} raycast={noRaycast}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      {SOFTBOXES.map(([x, y, z, w, d], i) => (
        <mesh
          key={`softbox-${i}`}
          geometry={shared.plane}
          position={[x, y, z]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[w, d, 1]}
          raycast={noRaycast}
        >
          {glow(look.panel, look.panelGlow)}
        </mesh>
      ))}
    </group>
  );
}
