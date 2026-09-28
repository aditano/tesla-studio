import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { backdropById } from "../scene/backdrops";
import { useStudio } from "../store";

/** A lamp drawn as a continuous emissive ribbon. `path` is the front-view
 * centreline (x, y) of one side; it is mirrored across x = 0 unless `centre`
 * is set. Each sample is snapped onto the real lamp surface by a ray fired
 * rearward, so the ribbon hugs the curved fascia instead of floating in front
 * of it. */
type Strip = {
  path: [number, number][];
  height: number;
  /** Light-bar elements follow the light-bar toggle and pulse in its demo. */
  bar?: boolean;
  /** Path already spans both sides (a full-width blade). */
  centre?: boolean;
};

type Projector = { x: number; y: number; radius: number };

type Rig = {
  /** Most-forward body station. The pool starts here and runs down the road. */
  noseZ: number;
  spots: [number, number, number][];
  strips: Strip[];
  projectors: Projector[];
  /** Material names the ribbons snap to. Falls back to the whole body. */
  surface?: RegExp;
};

const curve = (
  from: [number, number],
  to: [number, number],
  count: number,
  ease = (t: number) => t,
): [number, number][] =>
  Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const e = ease(t);
    return [
      THREE.MathUtils.lerp(from[0], to[0], t),
      THREE.MathUtils.lerp(from[1], to[1], e),
    ];
  });

/** Stations measured on each runtime mesh by raycasting its lamp housings. */
const RIGS: Record<string, Rig> = {
  // Highland: slim DRL blade along the upper lens edge, rising outboard.
  "model-3": {
    noseZ: -2.36,
    spots: [
      [-0.62, 0.64, -2.16],
      [0.62, 0.64, -2.16],
    ],
    // Upper lens edge rises from y 0.64 inboard to 0.70 at the outer tip.
    strips: [
      {
        path: curve([0.5, 0.626], [0.83, 0.688], 18, (t) => Math.sin((t * Math.PI) / 2)),
        height: 0.01,
      },
    ],
    projectors: [{ x: 0.63, y: 0.618, radius: 0.017 }],
    surface: /lamp_lens|headlight_led/,
  },
  // Juniper: full-width blade on the upper housing band, projectors below.
  "model-y": {
    noseZ: -2.4,
    spots: [
      [-0.72, 0.64, -2.26],
      [0.72, 0.64, -2.26],
    ],
    strips: [
      {
        path: curve([-0.84, 0.8], [0.84, 0.8], 57, (t) => t).map(
          ([x]) => [x, 0.756 + Math.max(0, Math.abs(x) - 0.48) * 0.12] as [number, number],
        ),
        height: 0.012,
        bar: true,
        centre: true,
      },
      // Lower lamp: a strip on the upper half of the housing, projector below.
      { path: curve([0.64, 0.657], [0.86, 0.66], 10), height: 0.011 },
    ],
    projectors: [{ x: 0.72, y: 0.628, radius: 0.015 }],
    surface: /lamp_housing|signature_led|headlight_led/,
  },
  "model-3-heritage": {
    noseZ: -2.34,
    spots: [
      [-0.62, 0.64, -2.3],
      [0.62, 0.64, -2.3],
    ],
    strips: [],
    projectors: [],
  },
  "model-s-heritage": {
    noseZ: -2.48,
    spots: [
      [-0.72, 0.66, -2.42],
      [0.72, 0.66, -2.42],
    ],
    strips: [],
    projectors: [],
  },
  // The imported Cybertruck is one steel shell with no lamp geometry. Draw the
  // full-width blade under the hood edge; its outer ends are the headlamps.
  cybertruck: {
    noseZ: -2.84,
    spots: [
      [-0.55, 1.12, -2.86],
      [0.55, 1.12, -2.86],
    ],
    strips: [
      // The front face spans |x| < 0.7 below the hood edge (y 1.0 to 1.18).
      { path: curve([-0.5, 1.166], [0.5, 1.166], 26), height: 0.016, bar: true, centre: true },
      { path: curve([0.5, 1.166], [0.7, 1.166], 8), height: 0.02 },
    ],
    projectors: [],
  },
  // The authored Cybercab carries its own emissive light bar and lamps.
  cybercab: {
    noseZ: -2.06,
    spots: [
      [-0.42, 0.64, -2.04],
      [0.42, 0.64, -2.04],
    ],
    strips: [],
    projectors: [],
  },
};

type Hit = { point: THREE.Vector3; normal: THREE.Vector3 };

/** Ray-cast rearward onto the body, returning body-local points and normals. */
export function makeSurfaceSnap(body: THREE.Object3D, surface?: RegExp) {
  {
    body.updateWorldMatrix(true, true);
    const all: THREE.Mesh[] = [];
    body.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o.userData.hitVolume) return;
      if (o.userData.presentationDetail) return;
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return;
      o.geometry.computeBoundingBox();
      const box = o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld);
      // Only front-facing meshes can host a lamp; skip the rest for speed.
      if (box.min.z > -1.2) return;
      all.push(o);
    });
    const named = surface
      ? all.filter((m) =>
          (Array.isArray(m.material) ? m.material : [m.material]).some((x) =>
            surface.test(x.name),
          ),
        )
      : [];
    const targets = named.length ? named : all;
    const ray = new THREE.Raycaster();
    const inverse = body.matrixWorld.clone().invert();
    const normalMatrix = new THREE.Matrix3();
    // Lens meshes are often single-sided with mirrored normals on one side of
    // the car. Test both faces so the ray stops at the outer lens instead of
    // passing through to housing internals.
    const sides = new Map<THREE.Material, THREE.Side>();
    for (const mesh of targets)
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        sides.set(m, m.side);
    return (x: number, y: number): Hit | null => {
      const origin = new THREE.Vector3(x, y, -12).applyMatrix4(body.matrixWorld);
      ray.set(origin, new THREE.Vector3(0, 0, 1).transformDirection(body.matrixWorld));
      sides.forEach((_, m) => (m.side = THREE.DoubleSide));
      const hit = ray.intersectObjects(targets, false)[0];
      sides.forEach((side, m) => (m.side = side));
      if (!hit?.face) return null;
      normalMatrix.getNormalMatrix(hit.object.matrixWorld);
      const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      // Double-sided exports can report the inward face; lamps face forward.
      if (normal.z > 0) normal.negate();
      return {
        point: hit.point.clone().applyMatrix4(inverse),
        normal: normal.transformDirection(inverse),
      };
    };
  }
}

function useSurfaceSnap(body: THREE.Object3D | undefined, surface?: RegExp) {
  return useMemo(() => (body ? makeSurfaceSnap(body, surface) : null), [body, surface]);
}

/** Drop samples that jump in depth relative to both neighbours (a ray that
 * slipped past the lens edge), then ease the depth so the ribbon is smooth. */
function settle(hits: (Hit | null)[]): (Hit | null)[] {
  const out = hits.map((hit, i) => {
    if (!hit) return null;
    const near = [hits[i - 1], hits[i + 1]].filter((h): h is Hit => !!h);
    if (!near.length) return hit;
    const jump = Math.min(...near.map((h) => Math.abs(h.point.z - hit.point.z)));
    return jump > 0.035 ? null : hit;
  });
  return out.map((hit, i) => {
    if (!hit) return null;
    const near = [out[i - 1], hit, out[i + 1]].filter((h): h is Hit => !!h);
    const point = hit.point.clone();
    point.z = near.reduce((sum, h) => sum + h.point.z, 0) / near.length;
    return { point, normal: hit.normal };
  });
}

/** Build one ribbon from snapped samples; gaps in the housing split it. */
function ribbon(samples: (Hit | null)[], height: number) {
  const hits = settle(samples);
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3();
  let previous = -1;
  hits.forEach((hit, i) => {
    if (!hit) {
      previous = -1;
      return;
    }
    // Keep the ribbon vertical in the fascia plane and lift it off the lens.
    up.set(0, 1, 0).addScaledVector(hit.normal, -hit.normal.y).normalize();
    const base = hit.point.clone().addScaledVector(hit.normal, 0.003);
    const top = base.clone().addScaledVector(up, height / 2);
    const bottom = base.clone().addScaledVector(up, -height / 2);
    const at = positions.length / 3;
    positions.push(...top.toArray(), ...bottom.toArray());
    if (previous >= 0 && i === previous + 1) {
      const a = at - 2;
      indices.push(a, a + 1, at, at, a + 1, at + 1);
    }
    previous = i;
  });
  if (!indices.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function usePoolMap() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const v = y / (size - 1);
      const along = Math.exp(-v * 3.1) * (1 - v);
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const across = Math.cos((u - 0.5) * Math.PI) ** 1.35;
        const alpha = Math.max(0, Math.min(1, along * across));
        const i = (y * size + x) * 4;
        image.data[i] = 232;
        image.data[i + 1] = 240;
        image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
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
  noseZ,
  intensity,
}: {
  position: [number, number, number];
  noseZ: number;
  intensity: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const aim: [number, number, number] = [
    position[0] * 0.2,
    0.02,
    noseZ - 8.5,
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
        angle={0.26}
        penumbra={1}
        distance={12}
        decay={2}
        intensity={intensity}
        color="#e7eef8"
        castShadow={false}
      />
      <object3D ref={target} position={aim} />
    </>
  );
}

/** Trapezoid on the road ahead of the nose, wide end away from the car. The
 * winding is counter-clockwise seen from above, so the face points up. */
export function poolGeometry(noseZ: number) {
  {
    const length = 5.2;
    const near = noseZ - 0.04;
    const far = near - length;
    const w0 = 0.42;
    const w1 = 1.15;
    const y = 0.006;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-w0, y, near, w0, y, near, -w1, y, far, w1, y, far],
        3,
      ),
    );
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2),
    );
    geo.setIndex([0, 1, 2, 1, 3, 2]);
    geo.computeVertexNormals();
    return geo;
  }
}

function Pool({
  noseZ,
  opacity,
  map,
}: {
  noseZ: number;
  opacity: number;
  map: THREE.Texture;
}) {
  const geometry = useMemo(() => poolGeometry(noseZ), [noseZ]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (opacity <= 0) return null;
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        map={map}
        color="#d5e2f4"
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped
      />
    </mesh>
  );
}

/** Emissive lamp surfaces. Light-bar elements pulse during the light bar demo
 * and settle back to a steady level afterwards. */
function LampGlow({
  geometry,
  lit,
  bar,
}: {
  geometry: THREE.BufferGeometry;
  lit: boolean;
  bar: boolean;
}) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const pulse = useStudio((s) => s.demoFeature === "lightbar" && bar);
  useFrame(({ clock }) => {
    const material = glow.current;
    if (!material) return;
    const base = bar ? 2 : 2.4;
    material.emissiveIntensity = pulse
      ? base + Math.sin(clock.elapsedTime * 3) * 0.45
      : base;
  });
  if (!lit) return null;
  return (
    <mesh geometry={geometry} renderOrder={3}>
      <meshStandardMaterial
        ref={glow}
        color="#f7fbff"
        emissive="#f4f8ff"
        emissiveIntensity={bar ? 2 : 2.4}
        roughness={0.42}
        metalness={0}
        side={THREE.DoubleSide}
        toneMapped
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

function mirror(path: [number, number][], centre?: boolean): [number, number][][] {
  if (centre) return [path];
  return [path, path.map(([x, y]) => [-x, y] as [number, number])];
}

export type LampPiece = {
  geometry: THREE.BufferGeometry;
  bar: boolean;
  /** -1 driver side (x < 0), 1 passenger side, 0 spans the centre line. */
  side: -1 | 0 | 1;
};

type Snap = (x: number, y: number) => Hit | null;

/** Emissive lamp geometry for a model, snapped onto its body. */
export function buildLamps(model: string, snap: Snap): LampPiece[] {
  const rig = RIGS[model] ?? RIGS["model-3"];
  const out: LampPiece[] = [];
  for (const strip of rig.strips)
    mirror(strip.path, strip.centre).forEach((path, index) => {
      const geometry = ribbon(path.map(([x, y]) => snap(x, y)), strip.height);
      const side = strip.centre ? 0 : index === 0 ? 1 : -1;
      if (geometry) out.push({ geometry, bar: !!strip.bar, side });
    });
  // Projectors are drawn as a disc that is conformed to the lens: each rim
  // vertex is snapped individually, so on a raked lens the disc wraps the
  // surface instead of standing out of it at an angle.
  for (const p of rig.projectors)
    for (const side of [1, -1] as const) {
      const centre = snap(side * p.x, p.y);
      if (!centre) continue;
      const segments = 24;
      const positions: number[] = [];
      const indices: number[] = [];
      const lift = (hit: Hit) => hit.point.clone().addScaledVector(hit.normal, 0.004);
      positions.push(...lift(centre).toArray());
      let rim = 0;
      for (let i = 0; i < segments; i += 1) {
        const a = (i / segments) * Math.PI * 2;
        const hit = snap(side * p.x + Math.cos(a) * p.radius, p.y + Math.sin(a) * p.radius);
        // Keep the disc whole: a rim sample that misses the lens reuses the
        // centre depth so the outline never folds back on itself.
        // A rim ray that slips past the lens onto a deeper housing face would
        // fold the disc back on itself; clamp its depth near the centre.
        const fallback = lift(centre).z;
        const point = hit ? lift(hit) : new THREE.Vector3(side * p.x + Math.cos(a) * p.radius, p.y + Math.sin(a) * p.radius, fallback);
        if (Math.abs(point.z - fallback) > p.radius * 0.9) point.z = fallback;
        positions.push(...point.toArray());
        rim += 1;
      }
      for (let i = 0; i < rim; i += 1) indices.push(0, 1 + i, 1 + ((i + 1) % rim));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      out.push({ geometry, bar: false, side });
    }
  return out;
}

/** Headlight rig: emissive lamp ribbons snapped to the body, road spots and a
 * soft ground pool. `body` is the sprung body group; the ribbons follow it so
 * they stay attached when ride height or suspension moves the shell. */
export function LampBeams({
  model,
  on,
  body,
}: {
  model: string;
  on: boolean;
  body?: THREE.Object3D;
}) {
  const environment = useStudio((s) => s.environment);
  const lightBar = useStudio((s) => s.lightBarOn);
  const backdrop = backdropById(environment);
  const pool = usePoolMap();
  const rig = RIGS[model] ?? RIGS["model-3"];
  const snap = useSurfaceSnap(body, rig.surface);
  const lamps = useMemo(() => (snap ? buildLamps(model, snap) : []), [snap, model]);
  useEffect(() => () => lamps.forEach((l) => l.geometry.dispose()), [lamps]);
  const follow = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = follow.current;
    if (!g || !body) return;
    g.position.copy(body.position);
    g.quaternion.copy(body.quaternion);
  });
  return (
    <group>
      <group ref={follow}>
        {lamps.map((lamp, index) => (
          <LampGlow
            key={index}
            geometry={lamp.geometry}
            bar={lamp.bar}
            lit={lamp.bar ? on && lightBar : on}
          />
        ))}
      </group>
      {rig.spots.map((position, index) => (
        <Spot
          key={`spot-${index}`}
          position={position}
          noseZ={rig.noseZ}
          intensity={on ? backdrop.beam : 0}
        />
      ))}
      <Pool noseZ={rig.noseZ} opacity={on ? backdrop.pool : 0} map={pool} />
    </group>
  );
}
