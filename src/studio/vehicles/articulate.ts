import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Vec3 = [number, number, number];

export type HalfSpace = { normal: Vec3; offset: number };

export type Facing = "out" | "up" | "back" | "forward" | "cover";

export type PanelSpec = {
  name: string;
  pivot: Vec3;
  clip: HalfSpace[];
  facing: Facing;
  /** Sign of x for "out" facing. Ignored otherwise. */
  side?: -1 | 1;
  facingMin?: number;
  /** How glass in this clip is allowed to travel with the panel. */
  glass?: "side" | "none" | "rear";
  /** Wheel hubs the panel must not swallow, in metres. */
  wheels?: { x: number; z: number; r: number; y: number }[];
  /** Extra cut planes. They split triangles but do not bound the panel. */
  split?: HalfSpace[];
};

type Attr = { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 };

const below = (axis: 0 | 1 | 2, value: number): HalfSpace => ({
  normal: [axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0],
  offset: value,
});
const above = (axis: 0 | 1 | 2, value: number): HalfSpace => ({
  normal: [axis === 0 ? -1 : 0, axis === 1 ? -1 : 0, axis === 2 ? -1 : 0],
  offset: -value,
});

function door(
  name: string,
  side: -1 | 1,
  z0: number,
  z1: number,
  y0: number,
  y1: number,
  inner: number,
  skin: number,
): PanelSpec {
  return {
    name,
    side,
    pivot: [side * skin, (y0 + y1) * 0.5, z0],
    facing: "out",
    facingMin: 0.22,
    clip: [
      side < 0 ? below(0, -inner) : above(0, inner),
      above(1, y0),
      below(1, y1),
      above(2, z0),
      below(2, z1),
    ],
  };
}

const HIGHLAND_WHEELS = [
  { x: -0.81, z: -1.49, r: 0.42, y: 0.7 },
  { x: 0.81, z: -1.49, r: 0.42, y: 0.7 },
  { x: -0.81, z: 1.385, r: 0.42, y: 0.7 },
  { x: 0.81, z: 1.385, r: 0.42, y: 0.7 },
];
const JUNIPER_WHEELS = [
  { x: -0.92, z: -1.5, r: 0.44, y: 0.72 },
  { x: 0.92, z: -1.5, r: 0.44, y: 0.72 },
  { x: -0.92, z: 1.41, r: 0.44, y: 0.72 },
  { x: 0.92, z: 1.41, r: 0.44, y: 0.72 },
];

/** Shut lines measured on each normalized runtime mesh. Hinges sit on the
 * panel edge: hood at the cowl, liftgate at the roof, doors on the A/B pillar. */
export function panelSpecs(model: string): PanelSpec[] {
  if (model === "model-3") {
    // 0.78 is just inboard of the painted skin, outboard of the cabin shell.
    const skin = {
      wheels: HIGHLAND_WHEELS,
      glass: "side" as const,
      facingMin: 0.4,
      split: [below(0, -0.78), above(0, 0.78)],
    };
    return [
      { ...door("door_fl", -1, -0.98, -0.02, 0.5, 1.33, 0.58, 0.93), ...skin },
      { ...door("door_fr", 1, -0.98, -0.02, 0.5, 1.33, 0.58, 0.93), ...skin },
      { ...door("door_rl", -1, 0.05, 0.96, 0.5, 1.32, 0.58, 0.93), ...skin },
      { ...door("door_rr", 1, 0.05, 0.96, 0.5, 1.32, 0.58, 0.93), ...skin },
      {
        name: "hood",
        pivot: [0, 0.93, -1.06],
        facing: "up",
        glass: "none",
        clip: [above(0, -0.84), below(0, 0.84), above(1, 0.74), above(2, -2.05), below(2, -1.06)],
      },
      {
        // Sedan deck lid, hinged at the base of the rear glass. The glass stays.
        name: "tailgate",
        pivot: [0, 1.05, 1.64],
        facing: "cover",
        glass: "none",
        clip: [above(0, -0.86), below(0, 0.86), above(1, 0.88), above(2, 1.64)],
      },
    ];
  }
  if (model === "model-y" || model === "juniper") {
    const skin = {
      wheels: JUNIPER_WHEELS,
      glass: "side" as const,
      facingMin: 0.4,
      split: [below(0, -0.82), above(0, 0.82)],
    };
    return [
      { ...door("door_fl", -1, -0.9, 0.02, 0.55, 1.38, 0.62, 0.97), ...skin },
      { ...door("door_fr", 1, -0.9, 0.02, 0.55, 1.38, 0.62, 0.97), ...skin },
      { ...door("door_rl", -1, 0.1, 1.02, 0.55, 1.36, 0.62, 0.97), ...skin },
      { ...door("door_rr", 1, 0.1, 1.02, 0.55, 1.36, 0.62, 0.97), ...skin },
      {
        name: "hood",
        pivot: [0, 1.12, -1.08],
        facing: "up",
        glass: "none",
        clip: [above(0, -0.88), below(0, 0.88), above(1, 0.92), above(2, -2.12), below(2, -1.08)],
      },
      {
        // Liftgate: rear glass and hatch, hinged under the roof.
        name: "tailgate",
        pivot: [0, 1.55, 1.22],
        facing: "cover",
        glass: "rear",
        clip: [above(0, -0.92), below(0, 0.92), above(1, 0.85), above(2, 1.28)],
      },
    ];
  }
  if (model === "cybertruck" || model === "cybertruck-import") {
    return [
      { ...door("door_fl", -1, -0.95, 0.08, 0.72, 1.48, 0.7, 0.86), glass: "side", facingMin: 0.35 },
      { ...door("door_fr", 1, -0.95, 0.08, 0.72, 1.48, 0.7, 0.86), glass: "side", facingMin: 0.35 },
      { ...door("door_rl", -1, 0.18, 1.28, 0.72, 1.48, 0.7, 0.9), glass: "side", facingMin: 0.35 },
      { ...door("door_rr", 1, 0.18, 1.28, 0.72, 1.48, 0.7, 0.9), glass: "side", facingMin: 0.35 },
      {
        name: "hood",
        pivot: [0, 1.22, -1.22],
        facing: "up",
        glass: "none",
        facingMin: 0.55,
        clip: [above(0, -0.92), below(0, 0.92), above(1, 1.08), above(2, -2.55), below(2, -1.22)],
      },
      {
        // Bottom hinge: the tailgate folds down.
        name: "tailgate",
        pivot: [0, 0.62, 2.55],
        facing: "back",
        glass: "none",
        facingMin: 0.4,
        clip: [above(0, -0.95), below(0, 0.95), above(1, 0.66), below(1, 1.32), above(2, 2.4)],
      },
      {
        name: "tonneau",
        pivot: [0, 1.52, 0.85],
        facing: "up",
        glass: "none",
        facingMin: 0.45,
        clip: [above(0, -0.88), below(0, 0.88), above(1, 1.42), above(2, 0.7), below(2, 2.3)],
      },
    ];
  }
  return [];
}

function nearWheel(spec: PanelSpec, x: number, y: number, z: number) {
  return (spec.wheels ?? []).some(
    (wheel) => y < wheel.y && Math.hypot(x - wheel.x, z - wheel.z) < wheel.r,
  );
}

/** Shut-line box plus a skin filter. `side` is the sign of x on that side of
 * the car, so outward normals satisfy `side * n.x > 0`. */
function claims(spec: PanelSpec, c: THREE.Vector3, n: THREE.Vector3, glass: boolean) {
  if (!inside(spec.clip, c.x, c.y, c.z) || nearWheel(spec, c.x, c.y, c.z)) return false;
  const min = spec.facingMin ?? 0.2;
  const ax = Math.abs(c.x);
  switch (spec.facing) {
    case "out": {
      const side = spec.side ?? -1;
      if (side * c.x <= 0) return false;
      const skin = Math.abs(spec.pivot[0]);
      if (glass) {
        if (spec.glass !== "side") return false;
        // Panoramic roof faces up. Side glass, including its inner face, rides
        // with the door even where the top of the window rolls toward the roof.
        if (n.y > 0.82 && Math.abs(n.x) < 0.35) return false;
        return ax > skin - 0.42;
      }
      // Outward paint, plus the backside of that same skin. The clip, not a
      // normal threshold, is the shut line, so the top edge stays straight.
      const outward = side * n.x > min && ax > skin - 0.16;
      const skinBack = side * n.x < -0.22 && ax > skin - 0.14 && n.y < 0.5;
      return outward || skinBack;
    }
    case "up":
      // Upward skin inside the clip. Vertical lamp housings and fascias stay.
      if (glass) return false;
      if (spec.name === "tonneau") return n.y > 0.32 && c.z > 0.9;
      return n.y > 0.22;
    case "back":
      if (glass) return false;
      return n.z > Math.max(min, 0.45) && n.y < 0.45;
    case "forward":
      return !glass && n.z < -min;
    case "cover":
      if (spec.glass === "none") {
        // Sedan deck lid, including the corners that don't face straight up.
        if (glass) return false;
        return n.y > 0.22;
      }
      // Liftgate. Roof glass ahead of the hinge stays; the rear glass rises.
      if (glass) return c.z > 1.45 && n.y < 0.75;
      if (n.y > 0.8 && c.z < 1.45) return false;
      return n.y > 0.4 || n.z > 0.45;
    default: {
      const _never: never = spec.facing;
      return _never;
    }
  }
}

function inside(clip: HalfSpace[], x: number, y: number, z: number) {
  return clip.every(({ normal: [a, b, c], offset }) => a * x + b * y + c * z <= offset + 1e-5);
}

function lerpAttr(a: Attr, b: Attr, t: number): Attr {
  return {
    p: a.p.clone().lerp(b.p, t),
    n: a.n.clone().lerp(b.n, t).normalize(),
    uv: a.uv.clone().lerp(b.uv, t),
  };
}

function splitPoly(poly: Attr[], plane: HalfSpace): Attr[][] {
  const [a0, b0, c0] = plane.normal;
  const d = poly.map((v) => a0 * v.p.x + b0 * v.p.y + c0 * v.p.z - plane.offset);
  if (d.every((v) => v >= -1e-7) || d.every((v) => v <= 1e-7)) return [poly];
  const under: Attr[] = [];
  const over: Attr[] = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const da = d[i];
    const db = d[j];
    if (da <= 0) under.push(poly[i]);
    if (da >= 0) over.push(poly[i]);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const cut = da < 0 ? lerpAttr(poly[i], poly[j], da / (da - db)) : lerpAttr(poly[j], poly[i], db / (db - da));
      under.push(cut);
      over.push(cut);
    }
  }
  return [under, over].filter((p) => p.length >= 3);
}

type Bucket = { positions: number[]; normals: number[]; uvs: number[] };

function pushTri(bucket: Bucket, poly: Attr[]) {
  for (let k = 1; k + 1 < poly.length; k++) {
    for (const v of [poly[0], poly[k], poly[k + 1]]) {
      bucket.positions.push(v.p.x, v.p.y, v.p.z);
      bucket.normals.push(v.n.x, v.n.y, v.n.z);
      bucket.uvs.push(v.uv.x, v.uv.y);
    }
  }
}

function geometryFrom(bucket: Bucket) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(bucket.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uvs, 2));
  const welded = mergeVertices(geometry, 1e-5);
  geometry.dispose();
  welded.computeBoundingSphere();
  return welded;
}

const SKIP_ROLE = /tire_rubber|wheel_finish|brake_|headlight_led|taillight_led|signature_led|lamp_lens/;

/** Cut shut lines out of a closed body and parent each panel on its hinge.
 * The clip is the whole panel, not only triangles whose normals point
 * outward, so handles and window frames stay on the door. */
export function articulate(body: THREE.Group, specs: PanelSpec[]) {
  if (!specs.length) return;
  const planes: HalfSpace[] = [];
  const seen = new Set<string>();
  for (const spec of specs)
    for (const plane of [...spec.clip, ...(spec.split ?? [])]) {
      const sign = plane.normal.find((v) => v !== 0)! < 0 ? -1 : 1;
      const key = [...plane.normal.map((v) => +(v * sign).toFixed(4)), +(plane.offset * sign).toFixed(4)].join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      planes.push(plane);
    }
  const groups = new Map<string, THREE.Group>();
  for (const spec of specs) {
    const group = new THREE.Group();
    group.name = spec.name;
    group.position.set(...spec.pivot);
    if (spec.name === "tonneau") group.userData.slide = 1.55;
    groups.set(spec.name, group);
  }
  const meshes = body.children.filter((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  for (const mesh of meshes) {
    if (mesh.userData.presentationDetail || mesh.userData.cabin || mesh.userData.noPanel) continue;
    const material = mesh.material;
    const names = (Array.isArray(material) ? material : [material]).map((m) => m.name).join(" ");
    if (SKIP_ROLE.test(names)) continue;
    const glass = /glass|window/i.test(names);
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
    const position = source.getAttribute("position") as THREE.BufferAttribute | undefined;
    const normal = source.getAttribute("normal") as THREE.BufferAttribute | undefined;
    const uv = source.getAttribute("uv") as THREE.BufferAttribute | undefined;
    if (!position || !normal) continue;
    const buckets = new Map<string, Bucket>();
    const rest: Bucket = { positions: [], normals: [], uvs: [] };
    const read = (i: number): Attr => ({
      p: new THREE.Vector3().fromBufferAttribute(position, i),
      n: new THREE.Vector3().fromBufferAttribute(normal, i),
      uv: uv ? new THREE.Vector2().fromBufferAttribute(uv, i) : new THREE.Vector2(),
    });
    for (let i = 0; i < position.count; i += 3) {
      let polys: Attr[][] = [[read(i), read(i + 1), read(i + 2)]];
      for (const plane of planes) polys = polys.flatMap((poly) => splitPoly(poly, plane));
      for (const poly of polys) {
        const c = new THREE.Vector3();
        const n = new THREE.Vector3();
        for (const v of poly) {
          c.add(v.p);
          n.add(v.n);
        }
        c.multiplyScalar(1 / poly.length);
        n.normalize();
        let target = "";
        for (const spec of specs) {
          const mirrorCap =
            spec.facing === "out" &&
            Math.abs(c.x) > 0.98 &&
            inside(spec.clip, c.x, c.y, c.z);
          if (!claims(spec, c, n, glass) && !mirrorCap) continue;
          target = spec.name;
          break;
        }
        const bucket = target
          ? buckets.get(target) ??
            buckets.set(target, { positions: [], normals: [], uvs: [] }).get(target)!
          : rest;
        pushTri(bucket, poly);
      }
    }
    if (source !== mesh.geometry) source.dispose();
    if (!buckets.size) continue;
    mesh.geometry.dispose();
    if (rest.positions.length) mesh.geometry = geometryFrom(rest);
    else {
      mesh.geometry = new THREE.BufferGeometry();
      mesh.removeFromParent();
    }
    for (const [name, bucket] of buckets) {
      const geometry = geometryFrom(bucket);
      const pivot = specs.find((spec) => spec.name === name)!.pivot;
      geometry.translate(-pivot[0], -pivot[1], -pivot[2]);
      const piece = new THREE.Mesh(geometry, material);
      piece.name = mesh.name;
      piece.castShadow = true;
      piece.receiveShadow = true;
      groups.get(name)!.add(piece);
    }
  }
  for (const group of groups.values()) if (group.children.length) body.add(group);
}

/** Dark frunk floor so an open hood does not show the road. */
export function addFrunkTub(body: THREE.Group, center: Vec3, size: Vec3) {
  const tub = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshPhysicalMaterial({
      color: "#14161a",
      roughness: 0.92,
      metalness: 0,
      anisotropy: 0,
    }),
  );
  tub.position.set(...center);
  tub.name = "frunk_tub";
  tub.userData.presentationDetail = true;
  tub.userData.noPanel = true;
  tub.castShadow = tub.receiveShadow = true;
  body.add(tub);
}
