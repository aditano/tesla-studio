import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applyExteriorPaint, applyInteriorFinish } from "../materials";
import { addCabinKit, applyDisplay } from "./cabin";
import type { Interior, Paint, PartId, Variant } from "../catalog";
import { useStudio } from "../store";
import { LampBeams } from "./LampBeams";

export type Panel =
  | "fixed"
  | "left"
  | "right"
  | "rearLeft"
  | "rearRight"
  | "hood"
  | "hatch";
type Vec3 = [number, number, number];
/** Half-space `normal · p <= offset` in the normalized frame (metres, +Y up,
 * -Z forward). A panel is the intersection of its half-spaces, so shut lines
 * can follow sloped pillars as well as vertical door edges. */
type HalfSpace = { normal: Vec3; offset: number };
type PanelRig = { pivot: Vec3; clip: HalfSpace[] };
export type HeritageRig = Record<Exclude<Panel, "fixed">, PanelRig>;

const below = (axis: 0 | 1 | 2, value: number): HalfSpace => ({
  normal: [axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0],
  offset: value,
});
const above = (axis: 0 | 1 | 2, value: number): HalfSpace => ({
  normal: [axis === 0 ? -1 : 0, axis === 1 ? -1 : 0, axis === 2 ? -1 : 0],
  offset: -value,
});

type DoorLines = {
  /** Hinge (leading) and trailing shut-line stations for the front door. */
  front: [number, number];
  rear: [number, number];
  /** Outer skin half-width at the hinge, and the inboard cut. */
  skin: number;
  inner: number;
  /** Sill and roof-rail heights. */
  y: [number, number];
  /** A-pillar: glass leading edge rises as y = base + slope * (z - z0). */
  pillar: { z0: number; base: number; slope: number };
};

function sideDoors(
  d: DoorLines,
): Pick<HeritageRig, "left" | "right" | "rearLeft" | "rearRight"> {
  const door = (side: -1 | 1, z: [number, number], front: boolean): PanelRig => {
    const clip = [
      side < 0 ? below(0, -d.inner) : above(0, d.inner),
      above(1, d.y[0]),
      below(1, d.y[1]),
      above(2, z[0]),
      below(2, z[1]),
    ];
    // Keep the A-pillar on the body: y - slope * z <= base - slope * z0.
    if (front)
      clip.push({
        normal: [0, 1, -d.pillar.slope],
        offset: d.pillar.base - d.pillar.slope * d.pillar.z0,
      });
    return { pivot: [side * d.skin, 0.7, z[0]], clip };
  };
  return {
    left: door(-1, d.front, true),
    right: door(1, d.front, true),
    rearLeft: door(-1, d.rear, false),
    rearRight: door(1, d.rear, false),
  };
}

const HOOD: PanelRig = {
  // Hinge at the cowl, just ahead of the windshield base.
  pivot: [0, 0.98, -1.05],
  clip: [above(0, -0.76), below(0, 0.76), above(1, 0.76), above(2, -2.13), below(2, -1.08)],
};
const HATCH: PanelRig = {
  // Hinge along the roof joint, above the rear glass.
  pivot: [0, 1.32, 1.18],
  clip: [above(0, -0.79), below(0, 0.79), above(1, 0.85), above(2, 1.22)],
};

/** Stations measured on each source mesh: door stations from the paint-mesh
 * shut-line gutters, heights from the sill and roof rail, and the A-pillar
 * from the leading edge of the side glass. */
const RIGS: Record<string, HeritageRig> = {
  "model-3-heritage": {
    ...sideDoors({
      front: [-1.02, 0.06],
      rear: [0.06, 0.98],
      skin: 0.9,
      inner: 0.62,
      y: [0.28, 1.35],
      pillar: { z0: -1.2, base: 0.92, slope: 0.4 },
    }),
    hood: HOOD,
    hatch: HATCH,
  },
  "model-s-heritage": {
    ...sideDoors({
      front: [-1.1, 0.2],
      rear: [0.2, 1.06],
      skin: 0.95,
      inner: 0.64,
      y: [0.26, 1.3],
      pillar: { z0: -1.0, base: 0.96, slope: 0.49 },
    }),
    hood: HOOD,
    hatch: HATCH,
  },
};

export function heritageRig(model: string): HeritageRig {
  return RIGS[model] ?? RIGS["model-3-heritage"];
}

export function heritagePivot(model: string, panel: Panel): Vec3 {
  return panel === "fixed" ? [0, 0, 0] : heritageRig(model)[panel].pivot;
}

/** True when a point lies inside every half-space of a panel. */
export function inPanel(rig: PanelRig, x: number, y: number, z: number) {
  return rig.clip.every(
    ({ normal: [a, b, c], offset }) => a * x + b * y + c * z <= offset + 1e-6,
  );
}

const PANELS: Panel[] = [
  "fixed",
  "left",
  "right",
  "rearLeft",
  "rearRight",
  "hood",
  "hatch",
];

type Vertex = Float32Array;

/** Every clip plane of every panel, deduplicated. Triangles are split on these
 * planes so shut lines are straight instead of following triangle edges. */
function cutPlanes(rig: HeritageRig): HalfSpace[] {
  const seen = new Set<string>();
  const planes: HalfSpace[] = [];
  for (const { clip } of Object.values(rig))
    for (const plane of clip) {
      // A plane and its flipped twin cut along the same line.
      const sign = plane.normal.find((v) => v !== 0)! < 0 ? -1 : 1;
      const key = [...plane.normal.map((v) => v * sign), plane.offset * sign].join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      planes.push(plane);
    }
  return planes;
}

function lerpVertex(a: Vertex, b: Vertex, t: number): Vertex {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

/** Split a convex polygon by one plane into the parts on each side. `at` is
 * the offset of the position components inside an interleaved vertex. */
function splitPolygon(poly: Vertex[], plane: HalfSpace, at: number): Vertex[][] {
  const [a0, b0, c0] = plane.normal;
  const d = poly.map(
    (v) => a0 * v[at] + b0 * v[at + 1] + c0 * v[at + 2] - plane.offset,
  );
  if (d.every((v) => v >= -1e-7) || d.every((v) => v <= 1e-7)) return [poly];
  const under: Vertex[] = [];
  const over: Vertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const a = poly[i], b = poly[j], da = d[i], db = d[j];
    if (da <= 0) under.push(a);
    if (da >= 0) over.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      // Always interpolate from the negative side. A shared edge is visited in
      // opposite order by its two triangles; a canonical direction gives both
      // bit-identical cut vertices, so the seam has no hairline crack.
      const cut =
        da < 0
          ? lerpVertex(a, b, da / (da - db))
          : lerpVertex(b, a, db / (db - da));
      under.push(cut);
      over.push(cut);
    }
  }
  return [under, over].filter((p) => p.length >= 3);
}

/** Bake the authored transforms once. Clip the static asset into hinged panels
 * along straight shut lines. UVs, normals and tangents are interpolated at each
 * cut, so the original texturing is preserved. This is a presentation rig, not
 * factory CAD. */
export function prepareHeritage(source: THREE.Group, model: string) {
  const rig = heritageRig(model);
  const planes = cutPlanes(rig);
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  const scale =
    (model === "model-3-heritage" ? 4.69 : 4.97) /
    (bounds.max.z - bounds.min.z);
  const transform = new THREE.Matrix4()
    .makeRotationY(Math.PI)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(
      new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z),
    );
  const panels = Object.fromEntries(
    PANELS.map((k) => [k, new THREE.Group()]),
  ) as Record<Panel, THREE.Group>;
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = (
      Array.isArray(object.material) ? object.material[0] : object.material
    ) as THREE.MeshStandardMaterial;
    let material = materials.get(original.name);
    if (!material) {
      material = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material, original);
      material.name = original.name;
      material.side = THREE.DoubleSide;
      material.envMapIntensity = 1;
      materials.set(original.name, material);
    }
    const geometry = object.geometry
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(transform, object.matrixWorld),
      );
    const movable = !/wheel|cal[._]|^cal_|_int_|int_Material/i.test(
      object.name,
    );
    const names = Object.keys(geometry.attributes);
    const attrs = names.map((n) => geometry.getAttribute(n));
    const sizes = attrs.map((a) => a.itemSize);
    const stride = sizes.reduce((a, b) => a + b, 0);
    const posOffset = sizes
      .slice(0, names.indexOf("position"))
      .reduce((a, b) => a + b, 0);
    const normalIndex = names.indexOf("normal");
    const normalOffset =
      normalIndex < 0
        ? -1
        : sizes.slice(0, normalIndex).reduce((a, b) => a + b, 0);
    const index = geometry.getIndex();
    const count = index?.count ?? attrs[0].count;
    const read = (i: number): Vertex => {
      const v = new Float32Array(stride);
      let o = 0;
      attrs.forEach((a, k) => {
        for (let c = 0; c < sizes[k]; c++) v[o + c] = a.getComponent(i, c);
        o += sizes[k];
      });
      return v;
    };
    const out: Record<Panel, number[]> = Object.fromEntries(
      PANELS.map((k) => [k, []]),
    ) as unknown as Record<Panel, number[]>;
    const classify = (poly: Vertex[]): Panel => {
      if (!movable) return "fixed";
      let x = 0, y = 0, z = 0;
      for (const v of poly) {
        x += v[posOffset];
        y += v[posOffset + 1];
        z += v[posOffset + 2];
      }
      x /= poly.length;
      y /= poly.length;
      z /= poly.length;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      if (normalOffset >= 0) {
        for (const v of poly) {
          nx += v[normalOffset];
          ny += v[normalOffset + 1];
          nz += v[normalOffset + 2];
        }
        nx /= poly.length;
        ny /= poly.length;
        nz /= poly.length;
      }
      const glassName = /glass|window|Material\.017|Material\.002/i.test(material.name);
      const facesPanel = (panel: Exclude<Panel, "fixed">) => {
        if (normalOffset < 0) return true;
        if (panel === "hood") return !glassName && ny > 0.35 && y > 0.8;
        if (panel === "hatch") return !glassName && (ny > 0.22 || (nz > 0.3 && y > 0.72));
        if (glassName) return Math.abs(nx) > 0.32 && ny < 0.55;
        // Roof skin stays put. Door shells, frames and handles swing together.
        if (ny > 0.55 && y > 1.02) return false;
        if (Math.abs(x) < 0.7) return false;
        return true;
      };
      for (const panel of PANELS) {
        if (panel === "fixed") continue;
        if (inPanel(rig[panel], x, y, z) && facesPanel(panel)) return panel;
      }
      return "fixed";
    };
    const push = (panel: Panel, v: Vertex) => {
      const list = out[panel];
      for (let c = 0; c < stride; c++) list.push(v[c]);
    };
    for (let i = 0; i < count; i += 3) {
      const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
      let polys: Vertex[][] = [ids.map(read)];
      if (movable)
        for (const plane of planes)
          polys = polys.flatMap((poly) => splitPolygon(poly, plane, posOffset));
      for (const poly of polys) {
        const panel = classify(poly);
        for (let k = 1; k + 1 < poly.length; k++) {
          push(panel, poly[0]);
          push(panel, poly[k]);
          push(panel, poly[k + 1]);
        }
      }
    }
    for (const panel of PANELS) {
      const data = out[panel];
      if (!data.length) continue;
      const vertices = data.length / stride;
      const part = new THREE.BufferGeometry();
      let o = 0;
      names.forEach((name, k) => {
        const array = new Float32Array(vertices * sizes[k]);
        for (let v = 0; v < vertices; v++)
          for (let c = 0; c < sizes[k]; c++)
            array[v * sizes[k] + c] = data[v * stride + o + c];
        part.setAttribute(name, new THREE.BufferAttribute(array, sizes[k]));
        o += sizes[k];
      });
      const normal = part.getAttribute("normal");
      if (normal)
        for (let v = 0; v < vertices; v++) {
          const n = new THREE.Vector3().fromBufferAttribute(normal, v);
          if (n.lengthSq() > 0) n.normalize();
          normal.setXYZ(v, n.x, n.y, n.z);
        }
      const indexed = mergeVertices(part, 1e-6);
      part.dispose();
      indexed.translate(
        ...(heritagePivot(model, panel).map((v) => -v) as Vec3),
      );
      indexed.computeBoundingSphere();
      const mesh = new THREE.Mesh(indexed, material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      panels[panel].add(mesh);
    }
    geometry.dispose();
  });
  addCabinKit(
    panels.fixed,
    materials,
    model === "model-s-heritage" ? "heritage-s" : "heritage-3",
  );
  return { panels, materials };
}

/** Opening angles. Doors swing about +Y at their leading edge, so the left
 * door turns negative and the right door positive. */
export const heritageOpenAngles: Record<Exclude<Panel, "fixed">, number> = {
  left: -1.05,
  right: 1.05,
  rearLeft: -0.98,
  rearRight: 0.98,
  hood: 0.75,
  hatch: -0.95,
};

const PANEL_PART: Record<Exclude<Panel, "fixed">, PartId> = {
  left: "door-fl",
  right: "door-fr",
  rearLeft: "door-rl",
  rearRight: "door-rr",
  hood: "frunk",
  hatch: "trunk",
};

function panelOpen(
  panel: Exclude<Panel, "fixed">,
  feature: string | null,
  open: Record<PartId, boolean>,
) {
  if (open[PANEL_PART[panel]]) return true;
  if (panel === "hood") return feature === "frunk";
  if (panel === "hatch") return feature === "trunk";
  return feature === "doors";
}

export function HeritageVehicle({
  model,
  paint,
  interior,
  variant,
}: {
  model: string;
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const { scene } = useGLTF(
    `${import.meta.env.BASE_URL}models/${model}/scene.gltf`,
  );
  const prepared = useMemo(() => prepareHeritage(scene, model), [scene, model]);
  const feature = useStudio((s) => s.demoFeature);
  const view = useStudio((s) => s.feature);
  const open = useStudio((s) => s.open);
  const lights = useStudio((s) => s.lightsOn);
  const refs = useRef<Partial<Record<Panel, THREE.Group>>>({});
  useLayoutEffect(() => {
    prepared.materials.forEach((mat, name) => {
      const is3 = model === "model-3-heritage";
      const body = is3 ? name === "CAR_PAINT" : name === "material_9";
      if (body) applyExteriorPaint(mat, paint);
      if (
        (is3 && name === "Material.015") ||
        (!is3 && name === "material") ||
        mat.name === "interior_leather"
      )
        applyInteriorFinish(mat, interior);
      if (mat.name === "display")
        applyDisplay(mat, mat.userData.screen === "cluster" ? "cluster" : "portrait");
      if ((is3 && name === "Material.014") || (!is3 && name === "Material.008"))
        mat.color.set(variant.caliper);
      if ((is3 && name === "Material.011") || name === "Rims") {
        mat.color.set(variant.spoiler ? "#454a50" : "#b9c0c8");
        mat.metalness = 0.95;
        mat.roughness = 0.23;
      }
      const cabinGlass = (is3 && name === "Material.017") || (!is3 && name === "Material.002");
      const lampLens = name === "Glass" || name === "glass";
      if (is3 && name === "Material.016") {
        mat.color.set("#0c0e11");
        mat.metalness = 0.12;
        mat.roughness = 0.45;
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
        mat.emissive.set("#000000");
        mat.emissiveIntensity = 0;
      }
      if (cabinGlass) {
        mat.color.set("#163042");
        mat.metalness = 0.04;
        mat.roughness = 0.045;
        mat.clearcoat = 1;
        mat.clearcoatRoughness = 0.04;
        mat.transparent = true;
        mat.opacity = 0.42;
        mat.transmission = 0;
        mat.thickness = 0;
        mat.envMapIntensity = 1.55;
        mat.depthWrite = true;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
        mat.side = THREE.DoubleSide;
        mat.emissive.set("#000000");
        mat.emissiveIntensity = 0;
      }
      if (lampLens) {
        mat.color.set("#1a242c");
        mat.metalness = 0.08;
        mat.roughness = 0.12;
        mat.transparent = true;
        mat.opacity = 0.55;
        mat.transmission = 0;
        mat.depthWrite = true;
        mat.envMapIntensity = 0.9;
        mat.emissive.set("#000000");
        mat.emissiveIntensity = 0;
      }
      if (name === "LED_PHARE" || name === "emit") {
        mat.emissive.set("#e5f0ff");
        mat.emissiveIntensity = lights ? 4.6 : 0;
      }
      mat.needsUpdate = true;
    });
    prepared.panels.fixed.traverse((o) => {
      if (o.name.startsWith("heritage_")) o.visible = view === "interior";
    });
  }, [prepared, paint, interior, variant, lights, model, view]);
  useEffect(
    () => () => {
      Object.values(prepared.panels).forEach((g) =>
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        }),
      );
      prepared.materials.forEach((m) => m.dispose());
    },
    [prepared],
  );
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (const id of PANELS) {
      if (id === "fixed") continue;
      const g = refs.current[id];
      if (!g) continue;
      const angle = panelOpen(id, feature, open) ? heritageOpenAngles[id] : 0;
      const axis = id === "hood" || id === "hatch" ? "x" : "y";
      const snap = (window as unknown as { __teslaSnap?: boolean }).__teslaSnap === true;
      g.rotation[axis] = snap
        ? angle
        : THREE.MathUtils.damp(g.rotation[axis], angle, 4, dt);
    }
  });
  // Wheels are part of this static rig; lowering its root would bury the tires.
  return (
    <group>
      {PANELS.map((id) => (
        <group
          key={id}
          position={heritagePivot(model, id)}
          ref={(g) => {
            if (g) refs.current[id] = g;
          }}
          onClick={
            id === "fixed"
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  useStudio.getState().togglePart(PANEL_PART[id]);
                }
          }
        >
          <primitive object={prepared.panels[id]} />
        </group>
      ))}
      {/* Dark tubs so an open frunk or hatch shows a floor, not the road. */}
      <mesh position={[0, 0.66, -1.52]}>
        <boxGeometry args={[1.22, 0.18, 0.8]} />
        <meshStandardMaterial color="#15171a" roughness={0.93} />
      </mesh>
      <mesh position={[0, 0.64, 1.68]}>
        <boxGeometry args={[1.25, 0.18, 0.75]} />
        <meshStandardMaterial color="#181a1d" roughness={0.95} />
      </mesh>
      {variant.spoiler && (
        <mesh position={[0, 1.03, 2.05]} rotation={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[1.35, 0.028, 0.15]} />
          <meshPhysicalMaterial
            color="#202226"
            metalness={0.6}
            roughness={0.3}
            clearcoat={1}
          />
        </mesh>
      )}
      <LampBeams model={model} on={lights} />
    </group>
  );
}
