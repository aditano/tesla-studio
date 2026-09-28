import * as THREE from "three";
import { VEHICLES, type FeatureId } from "../catalog";
import { shotFor } from "./shots";

/** A camera sightline: eye and look-at target, in metres. */
export type Sightline = {
  eye: [number, number, number];
  target: [number, number, number];
  narrow: boolean;
};

/** Mirrors CinematicControls: per-model framing span, the phone breakpoint
 * pull-back and the minimum eye height. Keep the two in sync. */
function framedEye(
  model: string,
  position: [number, number, number],
  target: [number, number, number],
  narrow: boolean,
): [number, number, number] {
  const span =
    (model === "cybertruck" ? 1.18 : model === "cybercab" ? 0.9 : 1) *
    (narrow ? 1.28 : 1);
  const eye: [number, number, number] = [
    target[0] + (position[0] - target[0]) * span,
    target[1] + (position[1] - target[1]) * span,
    target[2] + (position[2] - target[2]) * span,
  ];
  eye[1] = Math.max(eye[1], 0.62);
  return eye;
}

let cached: Sightline[] | null = null;

/** Every exterior camera the studio can fly to, on desktop and phone. */
export function studioSightlines(): Sightline[] {
  if (cached) return cached;
  const lines: Sightline[] = [];
  for (const vehicle of VEHICLES) {
    const features: (FeatureId | "overview")[] = [
      "overview",
      ...vehicle.features.map((f) => f.id),
    ];
    for (const feature of features) {
      if (feature === "interior") continue;
      const shot = shotFor(vehicle.id, feature);
      for (const narrow of [false, true])
        lines.push({
          eye: framedEye(vehicle.id, shot.position, shot.target, narrow),
          target: shot.target,
          narrow,
        });
    }
  }
  cached = lines;
  return lines;
}

/** Horizontal distance from (x, z) to the segment a-b, and the height of the
 * segment at the closest point. */
function closest(
  x: number,
  z: number,
  a: [number, number, number],
  b: [number, number, number],
) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = dx * dx + dz * dz;
  const t =
    length === 0
      ? 0
      : Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[2]) * dz) / length));
  const px = a[0] + dx * t;
  const pz = a[2] + dz * t;
  return {
    distance: Math.hypot(x - px, z - pz),
    y: a[1] + (b[1] - a[1]) * t,
    along: [px, pz] as [number, number],
  };
}

/** Largest vehicle envelope: lower body plus greenhouse, metres. */
const CAR_BOXES = [
  new THREE.Box3(new THREE.Vector3(-1.1, 0, -2.9), new THREE.Vector3(1.1, 1.05, 2.9)),
  new THREE.Box3(new THREE.Vector3(-0.8, 1.05, -1.1), new THREE.Vector3(0.8, 1.8, 1.9)),
];

type Rect = { x0: number; x1: number; y0: number; y1: number; depth: number };

function corners(box: THREE.Box3) {
  const out: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

function project(camera: THREE.Camera, points: THREE.Vector3[]): Rect | null {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, depth = Infinity;
  const v = new THREE.Vector3();
  for (const p of points) {
    v.copy(p).applyMatrix4(camera.matrixWorldInverse);
    if (v.z > -0.05) return null;
    depth = Math.min(depth, -v.z);
    v.copy(p).project(camera);
    x0 = Math.min(x0, v.x);
    x1 = Math.max(x1, v.x);
    y0 = Math.min(y0, v.y);
    y1 = Math.max(y1, v.y);
  }
  return { x0, x1, y0, y1, depth };
}

type Frame = { camera: THREE.PerspectiveCamera; car: Rect[] };
let frames: Frame[] | null = null;

/** Wide shots only: in close-ups the car fills the frame, and any backdrop
 * is necessarily seen over the bodywork. */
function wideFrames(): Frame[] {
  if (frames) return frames;
  frames = [];
  for (const line of studioSightlines()) {
    const camera = new THREE.PerspectiveCamera(line.narrow ? 42 : 32, line.narrow ? 0.46 : 1.6, 0.035, 400);
    camera.position.set(...line.eye);
    camera.lookAt(...line.target);
    camera.updateMatrixWorld();
    const car = CAR_BOXES.map((box) => project(camera, corners(box)));
    if (car.some((r) => !r)) continue;
    const rects = car as Rect[];
    const inView = rects.every((r) => r.x0 > -1 && r.x1 < 1 && r.y0 > -1 && r.y1 < 1);
    const tall = Math.max(...rects.map((r) => r.y1)) - Math.min(...rects.map((r) => r.y0));
    if (inView && tall < 1.3) frames.push({ camera, car: rects });
  }
  return frames;
}

/** True when a prop behind the car is partly hidden by it in a wide shot, so
 * that it pokes out of the roofline or the nose and reads as part of the car
 * or as floating. Fully hidden and fully clear props are fine. */
export function mergesWithCar(x: number, z: number, radius: number, height: number) {
  const prop = corners(
    new THREE.Box3(new THREE.Vector3(x - radius, 0, z - radius), new THREE.Vector3(x + radius, height, z + radius)),
  );
  const pad = 0.04;
  for (const { camera, car } of wideFrames()) {
    const r = project(camera, prop);
    if (!r) continue;
    for (const c of car) {
      if (r.depth < c.depth) continue;
      const overlaps = r.x1 > c.x0 - pad && r.x0 < c.x1 + pad && r.y1 > c.y0 - pad && r.y0 < c.y1 + pad;
      const hidden = r.x0 > c.x0 && r.x1 < c.x1 && r.y0 > c.y0 && r.y1 < c.y1;
      if (overlaps && !hidden) return true;
    }
  }
  return false;
}

/** True when any of these points (a slanted light shaft, say) would overlap
 * the car on screen in a wide shot, in front of it or behind it. */
export function overlapsCar(points: THREE.Vector3[], radius: number) {
  const pad = 0.03;
  for (const { camera, car } of wideFrames())
    for (const p of points) {
      const box = new THREE.Box3(
        p.clone().subScalar(radius),
        p.clone().addScalar(radius),
      );
      const r = project(camera, corners(box));
      if (!r) continue;
      for (const c of car)
        if (r.x1 > c.x0 - pad && r.x0 < c.x1 + pad && r.y1 > c.y0 - pad && r.y0 < c.y1 + pad)
          return true;
    }
  return false;
}

/** True when a prop of this footprint and height would sit in front of the
 * car in any studio shot, fill a lens, or merge with the car's silhouette. */
export function blocksSightline(
  x: number,
  z: number,
  radius: number,
  height: number,
  margin = 0.35,
): boolean {
  for (const line of studioSightlines()) {
    const eye = Math.hypot(x - line.eye[0], z - line.eye[2]);
    if (eye < radius + margin + 0.9) return true;
    const hit = closest(x, z, line.eye, line.target);
    if (hit.distance < radius + margin && hit.y < height) return true;
  }
  return mergesWithCar(x, z, radius + margin * 0.5, height);
}

/** Push a prop radially outward, away from the car, until it no longer
 * blocks any shot. Keeps authored layouts intact while guaranteeing the view
 * is clear. Returns the original position if it is already clear. */
export function clearOfSightlines(
  x: number,
  z: number,
  radius: number,
  height: number,
  margin = 0.35,
): [number, number] {
  if (!blocksSightline(x, z, radius, height, margin)) return [x, z];
  const heading = Math.atan2(z, x);
  const start = Math.hypot(x, z);
  for (let step = 1; step <= 120; step += 1) {
    const r = start + step * 0.4;
    // Sweep slightly around the original bearing as well as outward.
    for (const turn of [0, 0.1, -0.1, 0.22, -0.22, 0.4, -0.4, 0.65, -0.65]) {
      const nx = Math.cos(heading + turn) * r;
      const nz = Math.sin(heading + turn) * r;
      if (!blocksSightline(nx, nz, radius, height, margin)) return [nx, nz];
    }
  }
  return [Math.cos(heading) * (start + 48), Math.sin(heading) * (start + 48)];
}
