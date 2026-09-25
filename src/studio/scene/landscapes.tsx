import { useEffect, useMemo, useRef } from "react";
import type { JSX } from "react";
import { useFrame } from "@react-three/fiber";
import type { WebGLProgramParametersWithUniforms } from "three";
import * as THREE from "three";

type Tracked = { dispose: () => void };

type Tracker = {
  track: <T extends Tracked>(resource: T) => T;
  dispose: () => void;
};

type Instance = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color | null;
};

type WindowInstance = Instance & {
  repeat: [number, number];
  offset: [number, number];
};

type MarsScene = {
  dispose: () => void;
  group: THREE.Group;
  dustPositions: Float32Array;
  dustBase: Float32Array;
  dustAttribute: THREE.BufferAttribute;
  billboards: THREE.Object3D[];
};

type DesertScene = {
  dispose: () => void;
  group: THREE.Group;
  hazeTime: { value: number };
  billboards: THREE.Object3D[];
};

type CityScene = {
  dispose: () => void;
  group: THREE.Group;
  flickerA: THREE.MeshStandardMaterial;
  flickerB: THREE.MeshStandardMaterial;
};

const MARS_PALETTE = ["#6a2c22", "#a35038", "#c46a48", "#8a4030"] as const;
const DESERT_PALETTE = ["#e6c98a", "#c9a56a", "#f0ddb0", "#b8925a"] as const;
const ROCK_COUNT = 42;
const DUST_COUNT = 120;
const SCRUB_COUNT = 24;
const DESERT_ROCK_COUNT = 8;
const BUILDING_COUNT = 20;
const LAMP_ZS = [-20, -10, 0, 10] as const;

function createTracker(): Tracker {
  const resources: Tracked[] = [];
  return {
    track(resource) {
      resources.push(resource);
      return resource;
    },
    dispose() {
      for (let i = resources.length - 1; i >= 0; i -= 1) {
        resources[i].dispose();
      }
      resources.length = 0;
    },
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iz: number, seed: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7 + seed * 74.13) * 43758.5453123;
  return n - Math.floor(n);
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

function fbm(x: number, z: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    sum += amp * valueNoise(x * freq, z * freq, seed + octave * 19.17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function parkFlat(x: number, z: number, height: number, reachX: number, reachZ: number): number {
  const distance = Math.hypot(x / reachX, z / reachZ);
  const keep = distance <= 1 ? 0 : Math.min(1, (distance - 1) / 1.25);
  return 0.012 + (height - 0.012) * keep;
}

function marsHeightRaw(x: number, z: number): number {
  const warp = Math.sin(z * 0.041) * 3.6;
  const noise = fbm((x + warp) * 0.055, z * 0.048, 4.2);
  const broad =
    Math.sin(x * 0.082 + 0.6) * 0.4 + Math.cos(z * 0.058 + x * 0.018) * 0.34;
  const mid = Math.sin(x * 0.17 + z * 0.11) * 0.2 + Math.sin(z * 0.23 - x * 0.05) * 0.14;
  const fine = Math.sin(x * 0.39 + z * 0.27) * 0.07;
  const height = 0.2 + (noise - 0.28) * 1.12 + broad + mid + fine;
  return Math.min(1.4, Math.max(0.15, height));
}

function marsHeight(x: number, z: number): number {
  return parkFlat(x, z, marsHeightRaw(x, z), 2.8, 3.6);
}

function desertHeightRaw(x: number, z: number): number {
  const noise = fbm(x * 0.021, z * 0.017, 19.7);
  const broad =
    Math.sin(x * 0.036 + 0.4) * 0.42 + Math.sin(z * 0.022 + x * 0.01) * 0.36;
  const mid = Math.sin(x * 0.08 + z * 0.03) * 0.1;
  const height = 0.26 + (noise - 0.4) * 0.72 + broad + mid;
  return Math.min(1.1, Math.max(0.2, height));
}

function desertHeight(x: number, z: number): number {
  return parkFlat(x, z, desertHeightRaw(x, z), 3.4, 4.8);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReducedMotion(): boolean {
  return useMemo(() => prefersReducedMotion(), []);
}

function useSceneLifetime<T extends { dispose: () => void }>(factory: () => T): T {
  const slot = useRef<{ value: T; timer: number } | null>(null);
  if (slot.current === null) {
    slot.current = { value: factory(), timer: 0 };
  }
  const value = slot.current.value;
  useEffect(() => {
    const current = slot.current;
    if (current === null) return;
    window.clearTimeout(current.timer);
    return () => {
      current.timer = window.setTimeout(() => {
        current.value.dispose();
        if (slot.current === current) slot.current = null;
      }, 0);
    };
  }, []);
  return value;
}

function require2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  return context;
}

function paintStops(stops: readonly THREE.Color[], t: number, out: THREE.Color): void {
  const clamped = Math.min(0.999, Math.max(0, t));
  const scaled = clamped * (stops.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(stops.length - 1, index + 1);
  out.copy(stops[index]).lerp(stops[next], scaled - index);
}

function makeDunePlane(
  tracker: Tracker,
  heightAt: (x: number, z: number) => number,
  palette: readonly string[],
  colorSeed: number,
  roughness: number,
): THREE.Mesh {
  const geometry = tracker.track(new THREE.PlaneGeometry(90, 90, 48, 48));
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const stops = palette.map((hex) => new THREE.Color(hex));
  const painted = new THREE.Color();
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const y = heightAt(position.getX(i), position.getZ(i));
    if (y < minHeight) minHeight = y;
    if (y > maxHeight) maxHeight = y;
  }
  const span = Math.max(0.001, maxHeight - minHeight);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = heightAt(x, z);
    position.setY(i, y);
    const mottle = fbm(x * 0.16 + 2.2, z * 0.16, colorSeed);
    const blend = (y - minHeight) / span * 0.7 + (mottle - 0.32) * 0.58;
    paintStops(stops, blend, painted);
    colors[i * 3] = painted.r;
    colors[i * 3 + 1] = painted.g;
    colors[i * 3 + 2] = painted.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = tracker.track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness,
      metalness: 0,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeSoftDiskTexture(tracker: Tracker): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = require2d(canvas);
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.28)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = tracker.track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeDisk(
  tracker: Tracker,
  map: THREE.Texture,
  position: [number, number, number],
  radius: number,
  color: string,
  opacity: number,
  additive: boolean,
): THREE.Mesh {
  const geometry = tracker.track(new THREE.CircleGeometry(radius, 32));
  const material = tracker.track(
    new THREE.MeshBasicMaterial({
      map,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      toneMapped: !additive,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.frustumCulled = false;
  return mesh;
}

function faceCamera(disks: readonly THREE.Object3D[], camera: THREE.Camera): void {
  for (const disk of disks) disk.quaternion.copy(camera.quaternion);
}

function fillInstances(mesh: THREE.InstancedMesh, items: readonly Instance[]): void {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    dummy.position.set(item.position[0], item.position[1], item.position[2]);
    dummy.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
    dummy.scale.set(item.scale[0], item.scale[1], item.scale[2]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (item.color) mesh.setColorAt(i, item.color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
}

function scatterRocks(
  count: number,
  seed: number,
  heightAt: (x: number, z: number) => number,
  minSize: number,
  maxSize: number,
  colors: readonly [string, string],
  clearX: number,
  clearZ: number,
): Instance[] {
  const rand = mulberry32(seed);
  const dark = new THREE.Color(colors[0]);
  const darker = new THREE.Color(colors[1]);
  const items: Instance[] = [];
  let guard = 0;
  while (items.length < count && guard < 900) {
    guard += 1;
    const radius = 5 + rand() * 34;
    const theta = rand() * Math.PI * 2;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius * 0.92;
    const size = minSize + Math.pow(rand(), 1.55) * (maxSize - minSize);
    const nx = 0.62 + rand() * 0.38;
    const ny = 0.36 + rand() * 0.4;
    const nz = 0.58 + rand() * 0.42;
    const maxN = Math.max(nx, ny, nz);
    const sx = (size * nx) / maxN;
    const sy = (size * ny) / maxN;
    const sz = (size * nz) / maxN;
    if (Math.abs(x) < clearX + sx && Math.abs(z) < clearZ + sz) continue;
    let crowded = false;
    for (const other of items) {
      const dx = other.position[0] - x;
      const dz = other.position[2] - z;
      if (dx * dx + dz * dz < 2.1 * 2.1) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;
    const color = dark.clone().lerp(darker, rand());
    items.push({
      position: [x, heightAt(x, z) + sy * 0.42, z],
      rotation: [rand() * 0.7, rand() * Math.PI * 2, rand() * 0.7],
      scale: [sx, sy, sz],
      color,
    });
  }
  return items;
}

function makeHazePlane(
  tracker: Tracker,
  width: number,
  height: number,
  color: string,
  opacity: number,
  position: [number, number, number],
): THREE.Mesh {
  const geometry = tracker.track(new THREE.PlaneGeometry(width, height, 1, 1));
  const material = tracker.track(
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.frustumCulled = false;
  return mesh;
}

function buildMars(): MarsScene {
  const tracker = createTracker();
  const group = new THREE.Group();
  group.add(makeDunePlane(tracker, marsHeight, MARS_PALETTE, 8.4, 0.96));

  const rockGeometry = tracker.track(new THREE.DodecahedronGeometry(1, 0));
  const rockMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.95,
      metalness: 0.04,
    }),
  );
  const rocks = scatterRocks(
    ROCK_COUNT,
    0x5a15,
    marsHeight,
    0.15,
    1.3,
    ["#5a3028", "#3e241c"],
    2,
    3,
  );
  const rockMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rocks.length);
  fillInstances(rockMesh, rocks);
  tracker.track(rockMesh);
  group.add(rockMesh);

  const disk = makeSoftDiskTexture(tracker);
  const sun = makeDisk(tracker, disk, [18, 9, -24], 3.4, "#ffd0b0", 1, true);
  const phobos = makeDisk(tracker, disk, [-22, 11.5, 14], 1.05, "#b48978", 0.82, false);
  const deimos = makeDisk(tracker, disk, [12, 9.4, 30], 0.36, "#7a6c66", 0.7, false);
  group.add(sun, phobos, deimos);

  const dustRand = mulberry32(0xd057);
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  const dustBase = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const x = (dustRand() - 0.5) * 68;
    const y = 0.35 + dustRand() * 2.6;
    const z = (dustRand() - 0.5) * 68;
    dustBase[i * 3] = x;
    dustBase[i * 3 + 1] = y;
    dustBase[i * 3 + 2] = z;
    dustPositions[i * 3] = x;
    dustPositions[i * 3 + 1] = y;
    dustPositions[i * 3 + 2] = z;
  }
  const dustGeometry = tracker.track(new THREE.BufferGeometry());
  const dustAttribute = new THREE.BufferAttribute(dustPositions, 3);
  dustAttribute.setUsage(THREE.DynamicDrawUsage);
  dustGeometry.setAttribute("position", dustAttribute);
  dustGeometry.computeBoundingSphere();
  const dustMaterial = tracker.track(
    new THREE.PointsMaterial({
      color: "#e7b090",
      map: disk,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      size: 0.16,
      sizeAttenuation: true,
    }),
  );
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  group.add(dust);

  group.add(makeHazePlane(tracker, 78, 5.5, "#c4846a", 0.08, [0, 1.5, 40]));
  group.add(makeHazePlane(tracker, 70, 4.2, "#e0a080", 0.06, [0, 1.7, -38]));

  return {
    dispose: () => tracker.dispose(),
    group,
    dustPositions,
    dustBase,
    dustAttribute,
    billboards: [sun, phobos, deimos],
  };
}

function driftDust(scene: MarsScene, time: number): void {
  const { dustPositions, dustBase, dustAttribute } = scene;
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const index = i * 3;
    const phase = i * 0.37;
    dustPositions[index] = dustBase[index] + Math.sin(time * 0.16 + phase) * 0.42;
    dustPositions[index + 1] =
      dustBase[index + 1] + Math.sin(time * 0.23 + phase * 1.7) * 0.06;
    dustPositions[index + 2] = dustBase[index + 2] + Math.cos(time * 0.14 + phase) * 0.42;
  }
  dustAttribute.needsUpdate = true;
}

const HAZE_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 displaced = position;
  displaced.x += sin(position.y * 1.5 + uTime * 0.55) * 0.16;
  displaced.y += sin(position.x * 0.42 + uTime * 0.38) * 0.12;
  displaced.z += sin(position.x * 0.36 + position.y * 1.25 + uTime * 0.62) * 0.28;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const HAZE_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float fade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.48, vUv.y);
  fade *= smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  float band = 0.72 + 0.28 * sin(vUv.x * 16.0 + vUv.y * 5.0);
  gl_FragColor = vec4(uColor, uOpacity * fade * band);
  #include <fog_fragment>
}
`;

function buildDesert(): DesertScene {
  const tracker = createTracker();
  const group = new THREE.Group();
  group.add(makeDunePlane(tracker, desertHeight, DESERT_PALETTE, 23.1, 0.94));

  const rand = mulberry32(0x5c4b);
  const cones: Instance[] = [];
  const crowns: Instance[] = [];
  const olive = new THREE.Color("#6d7344");
  const shade = new THREE.Color("#4e5530");
  let guard = 0;
  while (cones.length < SCRUB_COUNT && guard < 800) {
    guard += 1;
    const side = rand() < 0.5 ? -1 : 1;
    const radius = 0.22 + rand() * 0.28;
    const x = side * (2.2 + radius + 0.45 + rand() * 22);
    const z = (rand() - 0.5) * 62;
    let crowded = false;
    for (const other of cones) {
      const dx = other.position[0] - x;
      const dz = other.position[2] - z;
      if (dx * dx + dz * dz < 1.7 * 1.7) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;
    const ground = desertHeight(x, z);
    const height = 0.36 + rand() * 0.48;
    const yaw = rand() * Math.PI * 2;
    const tilt = (rand() - 0.5) * 0.18;
    const color = olive.clone().lerp(shade, rand());
    cones.push({
      position: [x, ground + height * 0.5, z],
      rotation: [tilt, yaw, (rand() - 0.5) * 0.16],
      scale: [radius, height, radius],
      color,
    });
    crowns.push({
      position: [x, ground + height * 0.62, z],
      rotation: [0, yaw, 0],
      scale: [radius * 0.86, radius * 0.72, radius * 0.86],
      color,
    });
  }
  const scrubMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.9,
      metalness: 0,
    }),
  );
  const coneGeometry = tracker.track(new THREE.ConeGeometry(1, 1, 6));
  const crownGeometry = tracker.track(new THREE.SphereGeometry(1, 6, 5));
  const coneMesh = new THREE.InstancedMesh(coneGeometry, scrubMaterial, cones.length);
  const crownMesh = new THREE.InstancedMesh(crownGeometry, scrubMaterial, crowns.length);
  fillInstances(coneMesh, cones);
  fillInstances(crownMesh, crowns);
  tracker.track(coneMesh);
  tracker.track(crownMesh);
  group.add(coneMesh);
  group.add(crownMesh);

  const desertRocks = scatterRocks(
    DESERT_ROCK_COUNT,
    0x0c0a,
    desertHeight,
    0.18,
    0.72,
    ["#6e5844", "#4a3c30"],
    2.2,
    3,
  );
  const desertRockGeometry = tracker.track(new THREE.DodecahedronGeometry(1, 0));
  const desertRockMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.94,
      metalness: 0.03,
    }),
  );
  const desertRockMesh = new THREE.InstancedMesh(
    desertRockGeometry,
    desertRockMaterial,
    desertRocks.length,
  );
  fillInstances(desertRockMesh, desertRocks);
  tracker.track(desertRockMesh);
  group.add(desertRockMesh);

  const disk = makeSoftDiskTexture(tracker);
  const sun = makeDisk(tracker, disk, [-14, 11, -18], 3.6, "#fff1c8", 1, true);
  group.add(sun);

  const hazeTime = { value: 0 };
  const hazeUniforms = {
    uTime: hazeTime,
    uOpacity: { value: 0.08 },
    uColor: { value: new THREE.Color("#f3e2c0") },
  };
  const hazeMaterial = tracker.track(
    new THREE.ShaderMaterial({
      uniforms: hazeUniforms,
      vertexShader: HAZE_VERTEX,
      fragmentShader: HAZE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  const hazeGeometry = tracker.track(new THREE.PlaneGeometry(52, 8, 40, 16));
  const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
  haze.position.set(0, 2, -30);
  haze.frustumCulled = false;
  group.add(haze);

  return {
    dispose: () => tracker.dispose(),
    group,
    hazeTime,
    billboards: [sun],
  };
}

function tuneWindowShader(parameters: WebGLProgramParametersWithUniforms): void {
  if (parameters.vertexShader.includes("instanceWindowRepeat")) return;
  const pars = "#include <uv_pars_vertex>";
  const vertex = "#include <uv_vertex>";
  if (!parameters.vertexShader.includes(pars) || !parameters.vertexShader.includes(vertex)) {
    return;
  }
  parameters.vertexShader = parameters.vertexShader
    .replace(pars, `${pars}\nattribute vec2 instanceWindowRepeat;\nattribute vec2 instanceWindowOffset;`)
    .replace(
      vertex,
      `${vertex}
#ifdef USE_MAP
  vMapUv = vMapUv * instanceWindowRepeat + instanceWindowOffset;
#endif
#ifdef USE_EMISSIVEMAP
  vEmissiveMapUv = vEmissiveMapUv * instanceWindowRepeat + instanceWindowOffset;
#endif`,
    );
}

function makeFacade(
  tracker: Tracker,
  map: THREE.Texture,
  color: string,
  emissiveIntensity: number,
): THREE.MeshStandardMaterial {
  const material = tracker.track(
    new THREE.MeshStandardMaterial({
      color,
      map,
      emissive: "#ffd2a8",
      emissiveMap: map,
      emissiveIntensity,
      roughness: 0.7,
      metalness: 0.06,
    }),
  );
  material.onBeforeCompile = (parameters) => {
    tuneWindowShader(parameters);
  };
  material.customProgramCacheKey = () => "tesla-studio-city-windows";
  return material;
}

function makeWindowTexture(tracker: Tracker): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = require2d(canvas);
  context.fillStyle = "#07080c";
  context.fillRect(0, 0, 256, 256);
  const rand = mulberry32(0x51c0de);
  const cols = 8;
  const rows = 14;
  const cellW = 256 / cols;
  const cellH = 256 / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const roll = rand();
      let color = "#1a120c";
      if (roll > 0.9) color = "#9eb6ff";
      else if (roll > 0.74) color = "#ffc48a";
      else if (roll > 0.66) color = "#3a2a18";
      context.fillStyle = color;
      context.fillRect(col * cellW + 4, row * cellH + 3, cellW - 8, cellH - 6);
    }
  }
  const texture = tracker.track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function addWindowMesh(
  tracker: Tracker,
  group: THREE.Group,
  material: THREE.Material,
  items: readonly WindowInstance[],
): void {
  if (items.length === 0) return;
  const geometry = tracker.track(new THREE.BoxGeometry(1, 1, 1));
  const repeat = new Float32Array(items.length * 2);
  const offset = new Float32Array(items.length * 2);
  for (let i = 0; i < items.length; i += 1) {
    repeat[i * 2] = items[i].repeat[0];
    repeat[i * 2 + 1] = items[i].repeat[1];
    offset[i * 2] = items[i].offset[0];
    offset[i * 2 + 1] = items[i].offset[1];
  }
  geometry.setAttribute("instanceWindowRepeat", new THREE.InstancedBufferAttribute(repeat, 2));
  geometry.setAttribute("instanceWindowOffset", new THREE.InstancedBufferAttribute(offset, 2));
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  fillInstances(mesh, items);
  tracker.track(mesh);
  group.add(mesh);
}

function hasAntenna(index: number): boolean {
  return index === 0 || index === 4 || index === 9 || index === 12 || index === 15 || index === 18;
}

function buildCity(reduced: boolean): CityScene {
  const tracker = createTracker();
  const group = new THREE.Group();
  const windows = makeWindowTexture(tracker);
  const steadyIntensity = reduced ? 0.7 : 0.8;
  const flickerA = makeFacade(tracker, windows, "#141820", steadyIntensity);
  const flickerB = makeFacade(tracker, windows, "#1a1e28", steadyIntensity);
  const steady = makeFacade(tracker, windows, "#0e1218", steadyIntensity);
  const facades = [flickerA, flickerB, steady] as const;

  const rand = mulberry32(0xc17a);
  const bodies: [WindowInstance[], WindowInstance[], WindowInstance[]] = [[], [], []];
  const tops: [WindowInstance[], WindowInstance[], WindowInstance[]] = [[], [], []];
  const antennas: Instance[] = [];

  for (let i = 0; i < BUILDING_COUNT; i += 1) {
    const side = i < 10 ? -1 : 1;
    const along = i % 10;
    const width = 2.5 + rand() * 3.1;
    const depth = 2.3 + rand() * 1.45;
    const height = 3.5 + Math.pow(rand(), 1.25) * 12.5;
    const x = side * (5.5 + width * 0.5 + 0.4 + rand() * 5.2);
    const z = -23.5 + (along / 9) * 41 + (rand() - 0.5) * 0.5;
    const yaw = (rand() - 0.5) * 0.1;
    const slot = i % 3;
    const offset: [number, number] = [rand(), rand()];
    bodies[slot].push({
      position: [x, height * 0.5, z],
      rotation: [0, yaw, 0],
      scale: [width, height, depth],
      color: null,
      repeat: [Math.max(1, width / 4.4), Math.max(1, height / 5.2)],
      offset,
    });
    let roof = height;
    if (i % 2 === 0) {
      const setbackH = 0.7 + rand() * (height > 8 ? 2.6 : 1.05);
      const setbackW = width * (0.56 + rand() * 0.16);
      const setbackD = depth * (0.56 + rand() * 0.16);
      tops[slot].push({
        position: [x + side * width * 0.06, height + setbackH * 0.5, z],
        rotation: [0, yaw, 0],
        scale: [setbackW, setbackH, setbackD],
        color: null,
        repeat: [Math.max(1, setbackW / 4.4), Math.max(1, setbackH / 3.2)],
        offset: [offset[0] + 0.17, offset[1] + 0.11],
      });
      roof = height + setbackH;
    }
    if (hasAntenna(i)) {
      const antennaH = 0.75 + rand() * 1.25;
      antennas.push({
        position: [x - side * width * 0.18, roof + antennaH * 0.5, z],
        rotation: [0, 0, 0],
        scale: [1, antennaH, 1],
        color: null,
      });
    }
  }

  for (let slot = 0; slot < facades.length; slot += 1) {
    addWindowMesh(tracker, group, facades[slot], bodies[slot]);
    addWindowMesh(tracker, group, facades[slot], tops[slot]);
  }

  const antennaGeometry = tracker.track(new THREE.CylinderGeometry(0.018, 0.028, 1, 5));
  const antennaMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#12151c",
      roughness: 0.55,
      metalness: 0.4,
    }),
  );
  const antennaMesh = new THREE.InstancedMesh(antennaGeometry, antennaMaterial, antennas.length);
  fillInstances(antennaMesh, antennas);
  tracker.track(antennaMesh);
  group.add(antennaMesh);

  const lamps: Instance[] = [];
  const bulbs: Instance[] = [];
  for (const z of LAMP_ZS) {
    for (const side of [-1, 1]) {
      const x = side * 2.55;
      lamps.push({
        position: [x, 1.02, z],
        rotation: [0, 0, 0],
        scale: [1, 2.04, 1],
        color: null,
      });
      bulbs.push({
        position: [x, 2.12, z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: null,
      });
    }
  }
  const poleGeometry = tracker.track(new THREE.CylinderGeometry(0.045, 0.06, 1, 6));
  const poleMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#2a241e",
      emissive: "#ffb56a",
      emissiveIntensity: 0.22,
      roughness: 0.58,
      metalness: 0.28,
    }),
  );
  const bulbGeometry = tracker.track(new THREE.SphereGeometry(0.11, 8, 6));
  const bulbMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#ffb56a",
      emissive: "#ffb56a",
      emissiveIntensity: 2.2,
      roughness: 0.32,
    }),
  );
  const poleMesh = new THREE.InstancedMesh(poleGeometry, poleMaterial, lamps.length);
  const bulbMesh = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, bulbs.length);
  fillInstances(poleMesh, lamps);
  fillInstances(bulbMesh, bulbs);
  tracker.track(poleMesh);
  tracker.track(bulbMesh);
  group.add(poleMesh);
  group.add(bulbMesh);

  const roadGeometry = tracker.track(new THREE.PlaneGeometry(4.4, 70));
  const roadMaterial = tracker.track(
    new THREE.MeshPhysicalMaterial({
      color: "#0c1018",
      roughness: 0.16,
      metalness: 0.62,
      clearcoat: 0.4,
      envMapIntensity: 1.1,
    }),
  );
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, 0);
  road.receiveShadow = true;
  group.add(road);

  const stripGeometry = tracker.track(new THREE.PlaneGeometry(0.08, 58));
  const stripMaterial = tracker.track(
    new THREE.MeshStandardMaterial({
      color: "#2a2118",
      emissive: "#ffb56a",
      emissiveIntensity: 0.32,
      roughness: 0.45,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  stripMaterial.polygonOffset = true;
  stripMaterial.polygonOffsetFactor = -1;
  stripMaterial.polygonOffsetUnits = -1;
  const strip = new THREE.Mesh(stripGeometry, stripMaterial);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.028, -2);
  group.add(strip);

  return {
    dispose: () => tracker.dispose(),
    group,
    flickerA,
    flickerB,
  };
}

export function MarsScenery(): JSX.Element {
  const reduced = useReducedMotion();
  const scene = useSceneLifetime(buildMars);
  useFrame(({ clock, camera }) => {
    faceCamera(scene.billboards, camera);
    if (reduced) return;
    driftDust(scene, clock.elapsedTime);
  });
  return <primitive object={scene.group} dispose={null} />;
}

export function DesertScenery(): JSX.Element {
  const reduced = useReducedMotion();
  const scene = useSceneLifetime(buildDesert);
  useFrame(({ clock, camera }) => {
    faceCamera(scene.billboards, camera);
    scene.hazeTime.value = reduced ? 0 : clock.elapsedTime;
  });
  return <primitive object={scene.group} dispose={null} />;
}

export function CityScenery(): JSX.Element {
  const reduced = useReducedMotion();
  const scene = useSceneLifetime(() => buildCity(reduced));
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    scene.flickerA.emissiveIntensity = reduced ? 0.7 : 0.75 + Math.sin(time * 1.17) * 0.4;
    scene.flickerB.emissiveIntensity = reduced ? 0.7 : 0.75 + Math.sin(time * 0.73 + 2.2) * 0.4;
  });
  return <primitive object={scene.group} dispose={null} />;
}
