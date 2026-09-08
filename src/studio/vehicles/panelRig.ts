import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const HIGHLAND_PANEL_ORIGINS: Record<string, [number, number, number]> = {
  door_fl: [-0.9, 0.7, -0.92],
  door_fr: [0.9, 0.7, -0.92],
  door_rl: [-0.9, 0.7, 0.28],
  door_rr: [0.9, 0.7, 0.28],
  hood: [0, 0.89, -0.98],
  tailgate: [0, 0.98, 1.37],
};

export const JUNIPER_PANEL_ORIGINS: Record<string, [number, number, number]> = {
  door_fl: [-0.97, 0.84, -0.92],
  door_fr: [0.97, 0.84, -0.92],
  door_rl: [-0.97, 0.84, 0.28],
  door_rr: [0.97, 0.84, 0.28],
  hood: [0, 1.03, -0.98],
  tailgate: [0, 1.49, 0.91],
};

export const PANEL_NAMES = [
  "door_fl",
  "door_fr",
  "door_rl",
  "door_rr",
  "hood",
  "tailgate",
] as const;

type PanelName = (typeof PANEL_NAMES)[number];

type Box = { min: [number, number, number]; max: [number, number, number] };

export const HIGHLAND_HOLES: Record<PanelName, Box> = {
  door_fl: { min: [-1.14, 0.4, -0.9], max: [-0.72, 1.16, 0.14] },
  door_fr: { min: [0.72, 0.4, -0.9], max: [1.14, 1.16, 0.14] },
  door_rl: { min: [-1.14, 0.4, 0.32], max: [-0.72, 1.16, 1.08] },
  door_rr: { min: [0.72, 0.4, 0.32], max: [1.14, 1.16, 1.08] },
  hood: { min: [-0.7, 0.86, -2.14], max: [0.7, 1.24, -1.14] },
  tailgate: { min: [-0.7, 0.84, 1.4], max: [0.7, 1.3, 2.5] },
};

export const JUNIPER_HOLES: Record<PanelName, Box> = {
  door_fl: { min: [-1.2, 0.46, -0.9], max: [-0.74, 1.22, 0.14] },
  door_fr: { min: [0.74, 0.46, -0.9], max: [1.2, 1.22, 0.14] },
  door_rl: { min: [-1.2, 0.46, 0.32], max: [-0.74, 1.22, 1.08] },
  door_rr: { min: [0.74, 0.46, 0.32], max: [1.2, 1.22, 1.08] },
  hood: { min: [-0.74, 0.92, -2.14], max: [0.74, 1.42, -1.14] },
  tailgate: { min: [-0.82, 0.96, 1.28], max: [0.82, 1.74, 2.58] },
};

function allIn(
  xs: number[],
  ys: number[],
  zs: number[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
) {
  return (
    xs.every((x) => x >= x0 && x <= x1) &&
    ys.every((y) => y >= y0 && y <= y1) &&
    zs.every((z) => z >= z0 && z <= z1)
  );
}

/** Used only for leftover door-card / glass meshes, never for fused paint. */
export function classifyPassengerTriangle(
  xs: number[],
  ys: number[],
  zs: number[],
  kind: "highland" | "juniper",
  role = "",
) {
  const tall = kind === "juniper";
  const x = (xs[0] + xs[1] + xs[2]) / 3;
  const interior = /interior|carpet|display|leather/.test(role);
  const xMin = tall ? 0.78 : 0.76;
  const y0 = tall ? 0.48 : 0.44;
  const y1 = tall ? 1.2 : 1.14;
  const absX = xs.map(Math.abs);
  if (!interior || Math.abs(x) > xMin + 0.05) {
    if (allIn(absX, ys, zs, xMin, 2.4, y0, y1, -0.86, 0.1))
      return x < 0 ? "door_fl" : "door_fr";
    if (allIn(absX, ys, zs, xMin, 2.4, y0, y1, 0.36, 1.04))
      return x < 0 ? "door_rl" : "door_rr";
  }
  if (!interior) {
    const half = tall ? 0.7 : 0.66;
    if (allIn(xs, ys, zs, -half, half, tall ? 0.94 : 0.9, 1.45, -2.1, -1.18))
      return "hood";
    if (tall) {
      if (allIn(xs, ys, zs, -0.8, 0.8, 0.98, 1.72, 1.32, 2.6)) return "tailgate";
    } else if (allIn(xs, ys, zs, -0.66, 0.66, 0.88, 1.26, 1.44, 2.45))
      return "tailgate";
  }
  return "body";
}

export function classifyPassengerPanel(
  x: number,
  y: number,
  z: number,
  kind: "highland" | "juniper",
  role = "",
) {
  return classifyPassengerTriangle([x, x, x], [y, y, y], [z, z, z], kind, role);
}

export function attachPanelGroups(
  body: THREE.Group,
  groups: Record<string, THREE.Group>,
  origins: Record<string, [number, number, number]>,
) {
  for (const [name, position] of Object.entries(origins)) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    groups[name] = group;
    body.add(group);
  }
}

export function splitGeometryToPanels(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  meshName: string,
  groups: Record<string, THREE.Group>,
  origins: Record<string, [number, number, number]>,
  kind: "highland" | "juniper",
) {
  const pos = geometry.getAttribute("position");
  const index = geometry.index;
  const buckets = new Map<string, number[]>();
  const count = index?.count ?? pos.count;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    const xs = ids.map((j) => pos.getX(j));
    const ys = ids.map((j) => pos.getY(j));
    const zs = ids.map((j) => pos.getZ(j));
    const part = classifyPassengerTriangle(xs, ys, zs, kind);
    const list = buckets.get(part) ?? [];
    list.push(...ids);
    buckets.set(part, list);
  }
  for (const [part, ids] of buckets) {
    const selected = geometry.clone();
    selected.setIndex(ids);
    const expanded = selected.toNonIndexed();
    const compact = mergeVertices(expanded, 1e-6);
    selected.dispose();
    expanded.dispose();
    const origin = origins[part];
    if (origin) compact.translate(-origin[0], -origin[1], -origin[2]);
    compact.computeBoundingSphere();
    const mesh = new THREE.Mesh(compact, material);
    mesh.name = meshName;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (groups[part] ?? groups.body).add(mesh);
  }
}

type PanelSpec = {
  skin: [number, number, number];
  offset: [number, number, number];
  glass?: [number, number, number];
  glassLift?: number;
};

function panelSpecs(kind: "highland" | "juniper"): Record<PanelName, PanelSpec> {
  const tall = kind === "juniper";
  const doorH = tall ? 0.74 : 0.7;
  const doorZ = 0.98;
  return {
    door_fl: {
      skin: [0.06, doorH, doorZ],
      offset: [0.02, 0.08, 0.52],
      glass: [0.02, 0.28, 0.72],
      glassLift: 0.16,
    },
    door_fr: {
      skin: [0.06, doorH, doorZ],
      offset: [-0.02, 0.08, 0.52],
      glass: [0.02, 0.28, 0.72],
      glassLift: 0.16,
    },
    door_rl: {
      skin: [0.06, doorH, 0.7],
      offset: [0.02, 0.08, 0.4],
      glass: [0.02, 0.26, 0.5],
      glassLift: 0.16,
    },
    door_rr: {
      skin: [0.06, doorH, 0.7],
      offset: [-0.02, 0.08, 0.4],
      glass: [0.02, 0.26, 0.5],
      glassLift: 0.16,
    },
    hood: {
      skin: [tall ? 1.36 : 1.28, 0.05, 0.96],
      offset: [0, tall ? 0.14 : 0.12, -0.66],
    },
    tailgate: {
      skin: [tall ? 1.48 : 1.28, tall ? 0.7 : 0.42, 0.06],
      offset: [0, tall ? 0.08 : 0.06, tall ? 0.72 : 0.58],
      glass: [tall ? 1.2 : 1.05, tall ? 0.28 : 0.2, 0.02],
      glassLift: tall ? 0.18 : 0.12,
    },
  };
}

/** Stand-in hinged skins. Artist paint stays uncut; these fill the cutaway. */
export function addPresentationPanels(
  groups: Record<string, THREE.Group>,
  kind: "highland" | "juniper",
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  let paint = [...materials.values()].find((m) => m.name === "exterior_paint");
  if (!paint) {
    paint = new THREE.MeshPhysicalMaterial({ name: "exterior_paint" });
    materials.set("proxy|exterior_paint", paint);
  }
  let glass = [...materials.values()].find((m) => m.name === "glass");
  if (!glass) {
    glass = new THREE.MeshPhysicalMaterial({
      name: "glass",
      color: "#6a8898",
      transparent: true,
      opacity: 0.32,
      roughness: 0.06,
      metalness: 0.04,
      depthWrite: false,
    });
    materials.set("proxy|glass", glass);
  }
  const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  invisible.name = "panel_hit";
  materials.set("proxy|panel_hit", invisible as unknown as THREE.MeshPhysicalMaterial);
  const specs = panelSpecs(kind);
  for (const name of PANEL_NAMES) {
    const group = groups[name];
    const spec = specs[name];
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(spec.skin[0] + 0.04, spec.skin[1] + 0.06, spec.skin[2] + 0.04),
      invisible,
    );
    hit.position.set(...spec.offset);
    hit.userData.presentationDetail = true;
    hit.userData.hitVolume = true;
    hit.name = `hit_${name}`;
    group.add(hit);
    const skin = new THREE.Mesh(new THREE.BoxGeometry(...spec.skin), paint);
    skin.position.set(...spec.offset);
    skin.userData.presentationDetail = true;
    skin.castShadow = true;
    skin.visible = false;
    skin.name = `proxy_${name}`;
    group.add(skin);
    if (spec.glass) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(...spec.glass), glass);
      pane.position.set(
        spec.offset[0],
        spec.offset[1] + (spec.glassLift ?? 0),
        spec.offset[2],
      );
      pane.userData.presentationDetail = true;
      pane.visible = false;
      pane.name = `proxy_glass_${name}`;
      group.add(pane);
    }
  }
}

export function applyPaintHoles(
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  materials.forEach((material) => {
    if (!/exterior_paint|glass|interior_leather/.test(material.name)) return;
    if (material.userData.paintHoles) return;
    const holeMin = Array.from({ length: 6 }, () => new THREE.Vector3());
    const holeMax = Array.from({ length: 6 }, () => new THREE.Vector3());
    const holeOn = new Float32Array(6);
    material.userData.paintHoles = { holeMin, holeMax, holeOn };
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previous?.(shader, renderer);
      shader.uniforms.uHoleMin = { value: holeMin };
      shader.uniforms.uHoleMax = { value: holeMax };
      shader.uniforms.uHoleOn = { value: holeOn };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vPaintWorld;",
        )
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvPaintWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          varying vec3 vPaintWorld;
          uniform vec3 uHoleMin[6];
          uniform vec3 uHoleMax[6];
          uniform float uHoleOn[6];`,
        )
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
          for (int i = 0; i < 6; i++) {
            if (uHoleOn[i] > 0.5 &&
                vPaintWorld.x >= uHoleMin[i].x && vPaintWorld.x <= uHoleMax[i].x &&
                vPaintWorld.y >= uHoleMin[i].y && vPaintWorld.y <= uHoleMax[i].y &&
                vPaintWorld.z >= uHoleMin[i].z && vPaintWorld.z <= uHoleMax[i].z) discard;
          }`,
        );
    };
    material.customProgramCacheKey = () => "paint-holes-v1";
    material.needsUpdate = true;
  });
}

export function updatePaintHoles(
  materials: Map<string, THREE.Material>,
  active: Record<string, boolean>,
  kind: "highland" | "juniper",
) {
  const boxes = kind === "juniper" ? JUNIPER_HOLES : HIGHLAND_HOLES;
  materials.forEach((material) => {
    const holes = material.userData.paintHoles as
      | {
          holeMin: THREE.Vector3[];
          holeMax: THREE.Vector3[];
          holeOn: Float32Array;
        }
      | undefined;
    if (!holes) return;
    PANEL_NAMES.forEach((name, i) => {
      const box = boxes[name];
      holes.holeMin[i].set(...box.min);
      holes.holeMax[i].set(...box.max);
      holes.holeOn[i] = active[name] ? 1 : 0;
    });
  });
}

export function panelActivity(
  open: Record<string, boolean>,
  feature: string | null,
) {
  const doors = !!(open["door-fl"] || open["door-fr"] || open["door-rl"] || open["door-rr"]) ||
    feature === "doors" ||
    feature === "butterfly";
  return {
    door_fl: !!(open["door-fl"] || feature === "doors" || feature === "butterfly"),
    door_fr: !!(open["door-fr"] || feature === "doors" || feature === "butterfly"),
    door_rl: !!(open["door-rl"] || feature === "doors"),
    door_rr: !!(open["door-rr"] || feature === "doors"),
    hood: !!(open.frunk || feature === "frunk"),
    tailgate: !!(open.trunk || feature === "trunk"),
    anyDoor: doors,
  };
}
