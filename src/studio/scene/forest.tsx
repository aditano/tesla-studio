import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { JSX } from "react";
import * as THREE from "three";

const CONIFER_COUNT = 40;
const DECIDUOUS_COUNT = 8;
const TREE_COUNT = CONIFER_COUNT + DECIDUOUS_COUNT;
const FERN_COUNT = 84;
const BUSH_COUNT = 36;
const FIREFLY_COUNT = 60;
const NEAR_FIREFLIES = 44;
const BIRD_COUNT = 6;
const RAY_COUNT = 4;
const CANOPY_PER_TREE = 3;

const FOLIAGE = [0x1a3d2c, 0x24543a, 0x163528, 0x2f6a45] as const;
const TRUNKS = [0x3a2a1c, 0x4a3428, 0x2c2118, 0x51392a] as const;
const FIREFLY_COLORS = [0xd6ff6a, 0xfff2a8] as const;

const BIRD_SCALE = 2.4;
const FLOCK = { x: 1.2, z: 12, radius: 8.5 };
const BIRD_SLOTS: readonly { phase: number; altitude: number }[] = [
  { phase: (100 * Math.PI) / 180, altitude: 8.4 },
  { phase: (130 * Math.PI) / 180, altitude: 9.1 },
  { phase: (160 * Math.PI) / 180, altitude: 7.6 },
  { phase: (185 * Math.PI) / 180, altitude: 8.8 },
  { phase: (210 * Math.PI) / 180, altitude: 7.9 },
  { phase: (70 * Math.PI) / 180, altitude: 9.4 },
];

const OVERVIEW_EYE = new THREE.Vector3(5.35, 1.95, -6.35);
const OVERVIEW_AT = new THREE.Vector3(0, 0.92, 0.15);
const OVERVIEW_FORWARD = OVERVIEW_AT.clone().sub(OVERVIEW_EYE).normalize();
const OVERVIEW_RIGHT = new THREE.Vector3()
  .crossVectors(OVERVIEW_FORWARD, new THREE.Vector3(0, 1, 0))
  .normalize();
const OVERVIEW_UP = new THREE.Vector3()
  .crossVectors(OVERVIEW_RIGHT, OVERVIEW_FORWARD)
  .normalize();
const VERTICAL_HALF = (32 * Math.PI) / 180 / 2;
const HORIZONTAL_HALF = Math.atan(Math.tan(VERTICAL_HALF) * (16 / 9));

const dummy = new THREE.Object3D();
const tint = new THREE.Color();
const baseMatrix = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const flapMatrix = new THREE.Matrix4();
const outMatrix = new THREE.Matrix4();
const lookTarget = new THREE.Vector3();

type Rng = () => number;

type TreeSpot = {
  kind: "conifer" | "deciduous";
  x: number;
  z: number;
  h: number;
  yaw: number;
  lean: number;
  foliage: number;
  trunk: number;
};

type Firefly = {
  x: number;
  y: number;
  z: number;
  phase: number;
  size: number;
  drift: number;
  color: number;
};

type ForestWorld = {
  root: THREE.Group;
  fireflies: THREE.InstancedMesh;
  flies: readonly Firefly[];
  birdBody: THREE.InstancedMesh;
  birdHead: THREE.InstancedMesh;
  birdWingL: THREE.InstancedMesh;
  birdWingR: THREE.InstancedMesh;
  birdTail: THREE.InstancedMesh;
  deer: THREE.Group;
  legs: readonly THREE.Group[];
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  instanced: THREE.InstancedMesh[];
};

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

function pick<T extends readonly number[]>(rng: Rng, values: T): T[number] {
  return values[Math.floor(rng() * values.length)] ?? values[0];
}

function shiftFoliage(hex: number): number {
  const index = FOLIAGE.findIndex((entry) => entry === hex);
  return FOLIAGE[(index < 0 ? 0 : index + 1) % FOLIAGE.length] ?? hex;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Overview frustum for the cybertruck shot, with a little margin. */
function inOverview(x: number, y: number, z: number): boolean {
  const vx = x - OVERVIEW_EYE.x;
  const vy = y - OVERVIEW_EYE.y;
  const vz = z - OVERVIEW_EYE.z;
  const depth =
    vx * OVERVIEW_FORWARD.x + vy * OVERVIEW_FORWARD.y + vz * OVERVIEW_FORWARD.z;
  if (depth < 1.2) return false;
  const rx = vx * OVERVIEW_RIGHT.x + vy * OVERVIEW_RIGHT.y + vz * OVERVIEW_RIGHT.z;
  const uy = vx * OVERVIEW_UP.x + vy * OVERVIEW_UP.y + vz * OVERVIEW_UP.z;
  const yaw = Math.atan2(rx, depth);
  const pitch = Math.atan2(uy, depth);
  return Math.abs(yaw) < HORIZONTAL_HALF - 0.05 && Math.abs(pitch) < VERTICAL_HALF - 0.05;
}

function blocksCar(x: number, y: number, z: number): boolean {
  return Math.abs(x) < 1.15 && y < 1.95 && z > -2.85 && z < 2.85;
}

function stamp(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  rotX: number,
  rotY: number,
  rotZ: number,
  sx: number,
  sy: number,
  sz: number,
  hex?: number,
): void {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rotX, rotY, rotZ);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  if (hex !== undefined) {
    tint.setHex(hex);
    mesh.setColorAt(index, tint);
  }
}

function stampOnTree(
  mesh: THREE.InstancedMesh,
  index: number,
  tree: TreeSpot,
  localX: number,
  localY: number,
  localZ: number,
  sx: number,
  sy: number,
  sz: number,
  hex: number,
): void {
  dummy.position.set(tree.x, 0, tree.z);
  dummy.rotation.set(tree.lean * 0.35, tree.yaw, tree.lean);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  baseMatrix.copy(dummy.matrix);

  dummy.position.set(localX, localY, localZ);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  partMatrix.copy(dummy.matrix);
  outMatrix.multiplyMatrices(baseMatrix, partMatrix);
  mesh.setMatrixAt(index, outMatrix);
  tint.setHex(hex);
  mesh.setColorAt(index, tint);
}

function buildTrees(rng: Rng): TreeSpot[] {
  const trees: TreeSpot[] = [];
  const anchors: { x: number; z: number }[] = [];
  for (const side of [-1, 1]) {
    for (let slot = 0; slot < 5; slot += 1) {
      const z = THREE.MathUtils.clamp(-25 + slot * 11.2 + range(rng, -2.4, 2.4), -28, 22);
      const x = side * range(rng, 5.4, 9.2);
      anchors.push({ x, z });
    }
  }

  for (let i = 0; i < CONIFER_COUNT; i += 1) {
    const anchor = anchors[i % anchors.length] ?? anchors[0];
    if (!anchor) continue;
    let x = anchor.x;
    let z = anchor.z;
    if (i < 8) {
      const side = i % 2 === 0 ? -1 : 1;
      x = side * range(rng, 3.05, 4.35);
      z = THREE.MathUtils.clamp(-1 + (i % 4) * 4.1 + range(rng, -0.6, 0.6), -28, 22);
    } else {
      const ang = rng() * Math.PI * 2;
      const dist = range(rng, 0.35, i % 6 === 0 ? 4.6 : 2.8);
      x = anchor.x + Math.cos(ang) * dist;
      z = THREE.MathUtils.clamp(anchor.z + Math.sin(ang) * dist * 1.15, -28, 22);
      if (x * anchor.x <= 0 || Math.abs(x) < 2.9) {
        x = Math.sign(anchor.x) * range(rng, 2.95, 5.4);
      }
    }
    const tall = rng() < 0.28;
    trees.push({
      kind: "conifer",
      x,
      z,
      h: tall ? range(rng, 5.8, 7.5) : range(rng, 3.2, 5.7),
      yaw: rng() * Math.PI * 2,
      lean: (rng() - 0.5) * 0.1,
      foliage: pick(rng, FOLIAGE),
      trunk: pick(rng, TRUNKS),
    });
  }

  for (let i = 0; i < DECIDUOUS_COUNT; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    trees.push({
      kind: "deciduous",
      x: side * range(rng, 4.1, 7.6),
      z: THREE.MathUtils.clamp(-8 + i * 3.6 + range(rng, -0.8, 0.8), -28, 22),
      h: range(rng, 4.2, 6.6),
      yaw: rng() * Math.PI * 2,
      lean: (rng() - 0.5) * 0.06,
      foliage: pick(rng, FOLIAGE),
      trunk: pick(rng, TRUNKS),
    });
  }
  return trees;
}

function buildFireflies(rng: Rng, trees: readonly TreeSpot[]): Firefly[] {
  const flies: Firefly[] = [];
  const push = (x: number, y: number, z: number) => {
    flies.push({
      x,
      y,
      z,
      phase: rng() * Math.PI * 2,
      size: range(rng, 0.34, 0.58),
      drift: range(rng, 0.12, 0.28),
      color: rng() < 0.62 ? FIREFLY_COLORS[0] : FIREFLY_COLORS[1],
    });
  };

  for (let i = 0; i < NEAR_FIREFLIES; i += 1) {
    let x = 0;
    let y = 1.2;
    let z = 2;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      x = range(rng, -3.9, 1.8);
      y = range(rng, 0.5, 2.6);
      z = range(rng, -1.7, 7.5);
      if (!blocksCar(x, y, z) && inOverview(x, y, z)) break;
    }
    if (blocksCar(x, y, z)) {
      x = x < 0 ? -1.7 : 1.7;
      y = Math.max(y, 2.05);
    }
    push(x, y, z);
  }

  for (let i = NEAR_FIREFLIES; i < FIREFLY_COUNT; i += 1) {
    let tree = trees[Math.floor(rng() * trees.length)] ?? trees[0];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = trees[Math.floor(rng() * trees.length)] ?? tree;
      if (candidate && candidate.z > -6 && candidate.z < 16) {
        tree = candidate;
        break;
      }
    }
    if (!tree) continue;
    const x = tree.x + range(rng, -1.4, 1.4);
    const y = range(rng, 0.8, Math.min(3.4, tree.h * 0.55));
    const z = tree.z + range(rng, -1.2, 1.2);
    push(x, y, z);
  }
  const anchors: readonly [number, number, number][] = [
    [-1.5, 1.45, -2.2],
    [1.2, 1.7, -1.4],
    [0.35, 2.05, 0.4],
    [-0.9, 1.25, 1.6],
    [1.7, 1.85, 2.4],
    [-2.1, 2.15, 3.2],
    [0.15, 2.35, -0.2],
    [2.15, 1.35, 0.5],
  ];
  anchors.forEach((anchor, index) => {
    const fly = flies[index];
    if (!fly) return;
    fly.x = anchor[0];
    fly.y = anchor[1];
    fly.z = anchor[2];
    fly.size = 0.46 + (index % 3) * 0.08;
  });
  return flies;
}

function fireflyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the firefly sprite.");
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.28, "rgba(255,255,255,0.9)");
  glow.addColorStop(0.62, "rgba(255,255,255,0.25)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function orientSprite(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  size: number,
  cameraPosition: THREE.Vector3,
): void {
  dummy.position.set(x, y, z);
  dummy.scale.set(size, size, size);
  dummy.up.set(0, 1, 0);
  lookTarget.copy(cameraPosition);
  dummy.lookAt(lookTarget);
  dummy.rotateY(Math.PI);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function updateFireflies(
  mesh: THREE.InstancedMesh,
  flies: readonly Firefly[],
  time: number,
  reduced: boolean,
  cameraPosition: THREE.Vector3,
): void {
  for (let i = 0; i < flies.length; i += 1) {
    const fly = flies[i];
    if (!fly) continue;
    const drift = reduced ? 0 : fly.drift;
    const x = fly.x + Math.sin(time * 0.65 + fly.phase) * drift;
    const y = fly.y + Math.cos(time * 0.85 + fly.phase * 1.3) * drift * 0.65;
    const z = fly.z + Math.sin(time * 0.5 + fly.phase * 1.7) * drift;
    orientSprite(mesh, i, x, y, z, fly.size, cameraPosition);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function birdAltitude(base: number, phase: number, time: number, reduced: boolean): number {
  if (reduced) return base;
  const wobble = Math.sin(time * 0.55 + phase) - Math.sin(phase);
  return THREE.MathUtils.clamp(base + wobble * 1.2, 6, 11);
}

function updateBirds(world: ForestWorld, time: number, reduced: boolean): void {
  const beat = reduced ? 0 : Math.sin(time * 7.4) * 0.38;
  for (let i = 0; i < BIRD_COUNT; i += 1) {
    const slot = BIRD_SLOTS[i];
    if (!slot) continue;
    const angle = slot.phase + (reduced ? 0 : time * 0.16);
    const x = FLOCK.x + Math.cos(angle) * FLOCK.radius;
    const z = FLOCK.z + Math.sin(angle) * FLOCK.radius;
    const y = birdAltitude(slot.altitude, slot.phase, time, reduced);
    const yaw = Math.atan2(-Math.sin(angle), Math.cos(angle));

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(BIRD_SCALE, BIRD_SCALE, BIRD_SCALE);
    dummy.updateMatrix();
    baseMatrix.copy(dummy.matrix);

    const write = (
      mesh: THREE.InstancedMesh,
      px: number,
      py: number,
      pz: number,
      rx: number,
      ry: number,
      rz: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      dummy.position.set(px, py, pz);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      outMatrix.multiplyMatrices(baseMatrix, dummy.matrix);
      mesh.setMatrixAt(i, outMatrix);
    };

    write(world.birdBody, 0, 0, 0.02, -Math.PI / 2, 0, 0, 0.11, 0.46, 0.11);
    write(world.birdHead, 0, 0.03, 0.24, 0, 0, 0, 0.09, 0.07, 0.12);
    write(world.birdTail, 0, 0.02, -0.2, Math.PI / 2, 0, 0, 0.05, 0.16, 0.05);

    const flapWing = (mesh: THREE.InstancedMesh, side: number) => {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, side * (0.5 + beat));
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flapMatrix.copy(dummy.matrix);
      dummy.position.set(side * 0.3, 0, 0.02);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(0.5, 0.15, 1);
      dummy.updateMatrix();
      partMatrix.multiplyMatrices(flapMatrix, dummy.matrix);
      outMatrix.multiplyMatrices(baseMatrix, partMatrix);
      mesh.setMatrixAt(i, outMatrix);
    };
    flapWing(world.birdWingR, 1);
    flapWing(world.birdWingL, -1);
  }
  world.birdBody.instanceMatrix.needsUpdate = true;
  world.birdHead.instanceMatrix.needsUpdate = true;
  world.birdTail.instanceMatrix.needsUpdate = true;
  world.birdWingL.instanceMatrix.needsUpdate = true;
  world.birdWingR.instanceMatrix.needsUpdate = true;
}

function updateDeer(deer: THREE.Group, legs: readonly THREE.Group[], time: number): void {
  const pace = time * 0.42;
  deer.position.set(4.5, 0, 3.6 + Math.sin(pace) * 1.1);
  deer.rotation.y = Math.cos(pace) >= 0 ? 0 : Math.PI;
  const swing = Math.sin(time * 3.1) * 0.38;
  legs.forEach((leg, index) => {
    const diagonal = index === 0 || index === 3;
    leg.rotation.x = diagonal ? swing : -swing;
  });
}

function makeDeer(box: THREE.BoxGeometry, cone: THREE.ConeGeometry, material: THREE.Material): {
  group: THREE.Group;
  legs: THREE.Group[];
} {
  const group = new THREE.Group();
  group.position.set(4.5, 0, 3.6);

  const part = (
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = false;
    group.add(mesh);
    return mesh;
  };

  part(box, 0, 0.84, 0.02, 0.22, 0.3, 0.96);
  part(box, 0, 1.08, 0.4, 0.11, 0.38, 0.12, -0.62, 0, 0);
  part(box, 0, 1.26, 0.6, 0.13, 0.14, 0.26);
  part(box, 0, 1.22, 0.76, 0.08, 0.08, 0.16);
  part(cone, -0.05, 1.36, 0.54, 0.04, 0.12, 0.04, 0, 0, 0.45);
  part(cone, 0.05, 1.36, 0.54, 0.04, 0.12, 0.04, 0, 0, -0.45);
  part(cone, -0.035, 1.4, 0.52, 0.02, 0.16, 0.02, 0, 0, 0.7);
  part(cone, 0.035, 1.4, 0.52, 0.02, 0.16, 0.02, 0, 0, -0.7);
  part(cone, 0, 0.96, -0.48, 0.045, 0.12, 0.045, 1.15, 0, 0);

  const legs: THREE.Group[] = [];
  const hips: readonly [number, number][] = [
    [-0.08, 0.32],
    [0.08, 0.32],
    [-0.08, -0.3],
    [0.08, -0.3],
  ];
  for (const [hx, hz] of hips) {
    const pivot = new THREE.Group();
    pivot.position.set(hx, 0.72, hz);
    const leg = new THREE.Mesh(box, material);
    leg.scale.set(0.055, 0.68, 0.06);
    leg.position.y = -0.34;
    pivot.add(leg);
    group.add(pivot);
    legs.push(pivot);
  }
  return { group, legs };
}

function finalize(mesh: THREE.InstancedMesh, castShadow: boolean): void {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  mesh.computeBoundingSphere();
}

function createForest(): ForestWorld {
  const rng = mulberry32(0x5eedf045);
  const trees = buildTrees(rng);
  const flies = buildFireflies(rng, trees);

  const coneGeo = new THREE.ConeGeometry(1, 1, 7);
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.17, 1, 6);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const bushGeo = new THREE.SphereGeometry(1, 8, 6);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const sprite = fireflyTexture();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.94,
    metalness: 0,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.88,
    metalness: 0,
  });
  const rayMat = new THREE.MeshBasicMaterial({
    color: "#e7f3d2",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const flyMat = new THREE.MeshBasicMaterial({
    map: sprite,
    color: "#ffffff",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    premultipliedAlpha: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const birdMat = new THREE.MeshBasicMaterial({
    color: "#221c16",
    side: THREE.DoubleSide,
    fog: false,
  });
  const deerMat = new THREE.MeshStandardMaterial({
    color: "#4a3424",
    roughness: 0.86,
    metalness: 0,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
  const treeCones = new THREE.InstancedMesh(coneGeo, foliageMat, CONIFER_COUNT * 2);
  const canopy = new THREE.InstancedMesh(crownGeo, foliageMat, DECIDUOUS_COUNT * CANOPY_PER_TREE);
  const ferns = new THREE.InstancedMesh(coneGeo, foliageMat, FERN_COUNT);
  const bushes = new THREE.InstancedMesh(bushGeo, foliageMat, BUSH_COUNT);
  const rays = new THREE.InstancedMesh(coneGeo, rayMat, RAY_COUNT);
  const fireflies = new THREE.InstancedMesh(planeGeo, flyMat, FIREFLY_COUNT);
  const birdBody = new THREE.InstancedMesh(coneGeo, birdMat, BIRD_COUNT);
  const birdHead = new THREE.InstancedMesh(boxGeo, birdMat, BIRD_COUNT);
  const birdWingL = new THREE.InstancedMesh(planeGeo, birdMat, BIRD_COUNT);
  const birdWingR = new THREE.InstancedMesh(planeGeo, birdMat, BIRD_COUNT);
  const birdTail = new THREE.InstancedMesh(coneGeo, birdMat, BIRD_COUNT);

  trees.forEach((tree, index) => {
    if (tree.kind === "conifer") {
      const trunkH = Math.min(1.65, tree.h * 0.24);
      const lowerH = tree.h * 0.56;
      const upperH = tree.h * 0.44;
      const lowerR = 0.7 + (tree.h - 3.2) * 0.16;
      const upperR = lowerR * 0.58;
      const lowerY = trunkH * 0.82 + lowerH * 0.36;
      const upperY = tree.h - upperH * 0.46;
      stampOnTree(trunks, index, tree, 0, trunkH * 0.5, 0, 0.85, trunkH, 0.85, tree.trunk);
      const upperFoliage = shiftFoliage(tree.foliage);
      stampOnTree(treeCones, index, tree, 0, lowerY, 0, lowerR, lowerH, lowerR, tree.foliage);
      stampOnTree(
        treeCones,
        CONIFER_COUNT + index,
        tree,
        0,
        upperY,
        0,
        upperR,
        upperH,
        upperR,
        upperFoliage,
      );
      return;
    }
    const trunkH = tree.h * 0.46;
    const crown = 1.15 + (tree.h - 4.2) * 0.22;
    stampOnTree(trunks, index, tree, 0, trunkH * 0.5, 0, 1.35, trunkH, 1.35, tree.trunk);
    const blobs: readonly [number, number, number, number][] = [
      [0, trunkH + crown * 0.72, 0, crown],
      [crown * 0.55, trunkH + crown * 0.48, crown * 0.12, crown * 0.72],
      [-crown * 0.38, trunkH + crown * 0.95, -crown * 0.08, crown * 0.58],
    ];
    blobs.forEach((blob, blobIndex) => {
      const [lx, ly, lz, radius] = blob;
      const tucked = blobIndex === 2 && index % 2 === 1;
      const s = tucked ? radius * 0.42 : radius;
      stampOnTree(
        canopy,
        (index - CONIFER_COUNT) * CANOPY_PER_TREE + blobIndex,
        tree,
        lx,
        ly,
        lz,
        s * (blobIndex === 0 ? 1.15 : 1),
        s * (blobIndex === 0 ? 0.82 : 0.9),
        s,
        tree.foliage,
      );
    });
  });

  for (let i = 0; i < FERN_COUNT; i += 1) {
    const tree = trees[Math.floor(rng() * trees.length)] ?? trees[0];
    if (!tree) continue;
    let x = tree.x;
    let z = tree.z;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const ang = rng() * Math.PI * 2;
      const dist = range(rng, 0.35, 2.15);
      x = tree.x + Math.cos(ang) * dist;
      z = tree.z + Math.sin(ang) * dist;
      if (Math.abs(x) > 1.9) break;
    }
    if (Math.abs(x) <= 1.9) x = Math.sign(tree.x || 1) * range(rng, 2.05, 3.2);
    const height = range(rng, 0.2, 0.52);
    const radius = range(rng, 0.16, 0.4);
    stamp(
      ferns,
      i,
      x,
      height * 0.48,
      z,
      range(rng, -0.18, 0.18),
      rng() * Math.PI * 2,
      range(rng, -0.2, 0.2),
      radius,
      height,
      radius,
      pick(rng, FOLIAGE),
    );
  }

  for (let i = 0; i < BUSH_COUNT; i += 1) {
    const tree = trees[Math.floor(rng() * trees.length)] ?? trees[0];
    if (!tree) continue;
    let x = Math.sign(tree.x || 1) * 2.4;
    let z = tree.z;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const ang = rng() * Math.PI * 2;
      const dist = range(rng, 0.5, 2.4);
      x = tree.x + Math.cos(ang) * dist;
      z = tree.z + Math.sin(ang) * dist * 0.9;
      if (Math.abs(x) > 1.9) break;
    }
    if (Math.abs(x) <= 1.9) x = Math.sign(tree.x || 1) * range(rng, 2.1, 3.4);
    const sx = range(rng, 0.32, 0.78);
    const sy = range(rng, 0.18, 0.38);
    stamp(bushes, i, x, sy * 0.62, z, 0, rng() * Math.PI, 0, sx, sy, sx * range(rng, 0.85, 1.15), pick(rng, FOLIAGE));
  }

  const sun = new THREE.Vector3(5.4, 16.5, -4.2);
  const rayEnds: readonly [number, number, number][] = [
    [-0.35, 0.45, 2.4],
    [0.85, 0.4, 6.8],
    [-0.7, 0.5, -1.2],
    [0.25, 0.35, 11.4],
  ];
  rayEnds.forEach((end, index) => {
    const foot = new THREE.Vector3(end[0], end[1], end[2]);
    const dir = sun.clone().sub(foot).normalize();
    const length = 14.5 + index * 0.7;
    const radius = 1.45 + (index % 2) * 0.45;
    const mid = foot.clone().addScaledVector(dir, length * 0.5);
    dummy.position.copy(mid);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    dummy.scale.set(radius, length, radius);
    dummy.updateMatrix();
    rays.setMatrixAt(index, dummy.matrix);
  });

  flies.forEach((fly, index) => {
    tint.setHex(fly.color);
    fireflies.setColorAt(index, tint);
  });
  fireflies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const deer = makeDeer(boxGeo, coneGeo, deerMat);
  const root = new THREE.Group();
  root.name = "forest-scenery";
  root.add(trunks, treeCones, canopy, ferns, bushes, rays, fireflies);
  root.add(birdBody, birdHead, birdWingL, birdWingR, birdTail, deer.group);

  const instanced = [
    trunks,
    treeCones,
    canopy,
    ferns,
    bushes,
    rays,
    fireflies,
    birdBody,
    birdHead,
    birdWingL,
    birdWingR,
    birdTail,
  ];
  finalize(trunks, true);
  finalize(treeCones, true);
  finalize(canopy, true);
  finalize(ferns, false);
  finalize(bushes, false);
  finalize(rays, false);
  rays.frustumCulled = false;
  fireflies.frustumCulled = false;
  for (const bird of [birdBody, birdHead, birdWingL, birdWingR, birdTail]) {
    bird.frustumCulled = false;
    bird.castShadow = false;
  }

  const world: ForestWorld = {
    root,
    fireflies,
    flies,
    birdBody,
    birdHead,
    birdWingL,
    birdWingR,
    birdTail,
    deer: deer.group,
    legs: deer.legs,
    geometries: [coneGeo, trunkGeo, crownGeo, bushGeo, planeGeo, boxGeo],
    materials: [trunkMat, foliageMat, rayMat, flyMat, birdMat, deerMat],
    textures: [sprite],
    instanced,
  };

  updateFireflies(fireflies, flies, 0, true, OVERVIEW_EYE);
  if (fireflies.instanceColor) fireflies.instanceColor.needsUpdate = true;
  updateBirds(world, 0, true);

  const passThrough: THREE.Object3D["raycast"] = () => undefined;
  root.traverse((obj) => {
    obj.raycast = passThrough;
  });
  return world;
}

function disposeForest(world: ForestWorld): void {
  for (const mesh of world.instanced) mesh.dispose();
  for (const geometry of world.geometries) geometry.dispose();
  for (const material of world.materials) material.dispose();
  for (const texture of world.textures) texture.dispose();
}

export function ForestScenery(): JSX.Element {
  const world = useMemo(createForest, []);
  const reduced = useMemo(prefersReducedMotion, []);
  useEffect(() => () => disposeForest(world), [world]);
  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    updateFireflies(world.fireflies, world.flies, time, reduced, camera.position);
    updateBirds(world, time, reduced);
    if (!reduced) updateDeer(world.deer, world.legs, time);
  });
  return <primitive object={world.root} dispose={null} />;
}
