import * as THREE from "three";
import type { ModelId } from "../catalog";
import { shotFor } from "../scene/shots";

export type ScreenKind = "landscape" | "portrait" | "cluster";

const DIGITS: Record<string, string[]> = {
  "0": ["11111", "10001", "10001", "10001", "10001", "10001", "11111"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["11111", "00001", "00001", "11111", "10000", "10000", "11111"],
  "3": ["11111", "00001", "00001", "01111", "00001", "00001", "11111"],
  "4": ["10001", "10001", "10001", "11111", "00001", "00001", "00001"],
  "5": ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
  "6": ["11111", "10000", "10000", "11111", "10001", "10001", "11111"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["11111", "10001", "10001", "11111", "10001", "10001", "11111"],
  "9": ["11111", "10001", "10001", "11111", "00001", "00001", "11111"],
};

const textures = new Map<ScreenKind, THREE.DataTexture>();

function plotDigit(
  data: Uint8Array,
  width: number,
  digit: string,
  x0: number,
  y0: number,
  scale: number,
  rgb: [number, number, number],
) {
  const rows = DIGITS[digit];
  if (!rows) return;
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] !== "1") continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const x = x0 + dx * scale + sx;
          const y = y0 + dy * scale + sy;
          if (x < 0 || y < 0 || x >= width) continue;
          const i = (y * width + x) * 4;
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
          data[i + 3] = 255;
        }
      }
    }
  });
}

function fill(data: Uint8Array, rgb: [number, number, number]) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }
}

function rect(
  data: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rgb: [number, number, number],
) {
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= height) continue;
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= width) continue;
      const i = (yy * width + xx) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
}

/** Dark UI plate: speed, a route, and a status row. Shared by every cabin screen. */
export function displayTexture(kind: ScreenKind): THREE.DataTexture {
  const cached = textures.get(kind);
  if (cached) return cached;
  const landscape = kind !== "portrait";
  const width = landscape ? 256 : 160;
  const height = kind === "cluster" ? 96 : landscape ? 128 : 220;
  const data = new Uint8Array(width * height * 4);
  fill(data, [10, 16, 22]);
  rect(data, width, height, 0, 0, width, 10, [18, 28, 36]);
  const ink: [number, number, number] = [232, 240, 246];
  const route: [number, number, number] = [78, 214, 168];
  const speed = kind === "cluster" ? "68" : "72";
  let cursor = kind === "portrait" ? 28 : 16;
  const scale = kind === "cluster" ? 3 : kind === "portrait" ? 4 : 4;
  const y0 = kind === "portrait" ? 22 : kind === "cluster" ? 18 : 22;
  for (const digit of speed) {
    plotDigit(data, width, digit, cursor, y0, scale, ink);
    cursor += 6 * scale;
  }
  const mapY = kind === "portrait" ? 90 : 70;
  rect(data, width, height, 16, mapY, width - 32, 2, [32, 48, 58]);
  for (let i = 0; i < width - 48; i++) {
    const x = 24 + i;
    const y = mapY + 18 + Math.round(Math.sin(i * 0.08) * 10 + (i > width * 0.45 ? (i - width * 0.45) * 0.15 : 0));
    rect(data, width, height, x, y, 2, 2, route);
  }
  rect(data, width, height, width - 54, 18, 28, 6, route);
  rect(data, width, height, width - 54, 30, 18, 6, [180, 196, 210]);
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.flipY = true;
  textures.set(kind, texture);
  return texture;
}

export function applyDisplay(
  material: THREE.MeshPhysicalMaterial,
  kind: ScreenKind = "landscape",
) {
  const texture = displayTexture(kind);
  material.map = texture;
  material.emissiveMap = texture;
  material.color.set("#ffffff");
  material.emissive.set("#c5d8e4");
  material.emissiveIntensity = 0.55;
  material.roughness = 0.62;
  material.metalness = 0;
  material.envMapIntensity = 0.05;
  material.specularIntensity = 0.12;
  material.toneMapped = true;
  material.needsUpdate = true;
}

type Kit = {
  leather: THREE.MeshPhysicalMaterial;
  dash: THREE.MeshPhysicalMaterial;
  carpet: THREE.MeshPhysicalMaterial;
  display: THREE.MeshPhysicalMaterial;
  trim: THREE.MeshPhysicalMaterial;
};

function kitMaterials(
  materials: Map<string, THREE.MeshPhysicalMaterial>,
  screen: ScreenKind,
): Kit {
  const make = (
    name: string,
    color: string,
    roughness: number,
    metalness = 0,
  ) => {
    const key = `cabin-kit|${name}|${screen}`;
    let material = materials.get(key);
    if (!material) {
      material = new THREE.MeshPhysicalMaterial({ color, roughness, metalness });
      material.name = name;
      materials.set(key, material);
    }
    return material;
  };
  const display = make("display", "#10181c", 0.32, 0.02);
  display.userData.screen = screen;
  applyDisplay(display, screen);
  return {
    leather: make("interior_leather", "#1a1c1f", 0.62),
    dash: make("dashboard", "#1c1e22", 0.68, 0.04),
    carpet: make("carpet", "#14161a", 0.94),
    display,
    trim: make("cabin_trim", "#121418", 0.48, 0.16),
  };
}

function add(
  parent: THREE.Object3D,
  mesh: THREE.Mesh,
  name: string,
) {
  mesh.name = name;
  mesh.userData.cabin = true;
  mesh.userData.noPanel = true;
  mesh.userData.presentationDetail = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

const INTERIOR_ASPECT = 1;
const INTERIOR_FOV = 50;

function interiorCamera(model: ModelId) {
  const shot = shotFor(model, "interior");
  const cam = new THREE.PerspectiveCamera(INTERIOR_FOV, INTERIOR_ASPECT, 0.05, 40);
  cam.position.set(shot.position[0], shot.position[1], shot.position[2]);
  cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
  cam.updateMatrixWorld(true);
  return cam;
}

/** A point that projects to `ndcX, ndcY` on the fov-50 interior shot. */
function onInteriorView(
  cam: THREE.PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  depth: number,
) {
  const origin = cam.position.clone();
  const dir = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam).sub(origin).normalize();
  return origin.add(dir.multiplyScalar(depth));
}

function viewSpan(depth: number, ndcSpan: number) {
  return ndcSpan * depth * Math.tan(THREE.MathUtils.degToRad(INTERIOR_FOV / 2));
}

/** Parent the object so its world origin is `worldPoint` and its axes match the interior camera.
 * Camera local +Z points back at the lens, so a box's broad face is what the shot sees. */
function mount(
  parent: THREE.Object3D,
  object: THREE.Object3D,
  cam: THREE.PerspectiveCamera,
  worldPoint: THREE.Vector3,
) {
  parent.updateWorldMatrix(true, false);
  object.position.copy(parent.worldToLocal(worldPoint.clone()));
  const parentQuat = new THREE.Quaternion();
  parent.getWorldQuaternion(parentQuat);
  object.quaternion.copy(parentQuat.invert()).multiply(cam.quaternion);
  parent.add(object);
}

function faced(
  parent: THREE.Object3D,
  material: THREE.Material,
  name: string,
  cam: THREE.PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  depth: number,
  ndcW: number,
  ndcH: number,
  thick = 0.03,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(viewSpan(depth, ndcW), viewSpan(depth, ndcH), thick),
    material,
  );
  mesh.name = name;
  mesh.userData.cabin = true;
  mesh.userData.noPanel = true;
  mesh.userData.presentationDetail = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mount(parent, mesh, cam, onInteriorView(cam, ndcX, ndcY, depth));
  return mesh;
}

function put(
  parent: THREE.Object3D,
  mesh: THREE.Mesh,
  name: string,
  worldPoint: THREE.Vector3,
) {
  parent.updateWorldMatrix(true, false);
  mesh.position.copy(parent.worldToLocal(worldPoint.clone()));
  add(parent, mesh, name);
}

/** Seat backs stay upright in the car. Only the dash and screen face the lens. */
function seatInView(
  parent: THREE.Object3D,
  materials: Kit,
  name: string,
  cam: THREE.PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  depth: number,
) {
  const tall = viewSpan(depth, 0.5);
  const wide = viewSpan(depth, 0.3);
  const anchor = onInteriorView(cam, ndcX, ndcY, depth);
  const toCam = cam.position.clone().sub(anchor).normalize();
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(wide, tall * 0.62, Math.max(0.05, wide * 0.28)),
    materials.leather,
  );
  back.rotation.x = -0.22;
  put(parent, back, `${name}_cushion`, anchor);
  const rest = new THREE.Mesh(
    new THREE.BoxGeometry(wide * 0.46, tall * 0.2, Math.max(0.045, wide * 0.24)),
    materials.leather,
  );
  rest.rotation.x = -0.22;
  put(parent, rest, `${name}_rest`, anchor.clone().setY(anchor.y + tall * 0.4));
  const pan = anchor.clone().addScaledVector(toCam, wide * 0.42);
  pan.y -= tall * 0.34;
  put(
    parent,
    new THREE.Mesh(new THREE.BoxGeometry(wide * 0.92, Math.max(0.04, tall * 0.14), wide * 0.95), materials.leather),
    `${name}_pan`,
    pan,
  );
  for (const side of [-1, 1]) {
    const bolster = pan.clone();
    bolster.x += side * wide * 0.38;
    bolster.y += tall * 0.08;
    put(
      parent,
      new THREE.Mesh(
        new THREE.BoxGeometry(wide * 0.16, tall * 0.28, wide * 0.72),
        materials.leather,
      ),
      `${name}_bolster_${side > 0 ? "r" : "l"}`,
      bolster,
    );
  }
}

function yokeInView(
  parent: THREE.Object3D,
  material: THREE.Material,
  cam: THREE.PerspectiveCamera,
  ndcX: number,
  ndcY: number,
  depth: number,
) {
  const wide = viewSpan(depth, 0.34);
  const tall = viewSpan(depth, 0.22);
  const group = new THREE.Group();
  group.name = "cybertruck_cabin_yoke";
  const bar = (w: number, h: number, x: number, y: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), material);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    group.add(mesh);
  };
  bar(wide, tall * 0.16, 0, tall * 0.34);
  bar(wide * 0.7, tall * 0.14, 0, -tall * 0.34);
  bar(wide * 0.1, tall * 0.78, -wide * 0.34, 0);
  bar(wide * 0.1, tall * 0.78, wide * 0.34, 0);
  group.traverse((child) => {
    child.userData.cabin = true;
    child.userData.noPanel = true;
    child.userData.presentationDetail = true;
  });
  mount(parent, group, cam, onInteriorView(cam, ndcX, ndcY, depth));
}

/** Seats, a dash, a display and trim, placed for the interior camera of each car. */
export function addCabinKit(
  parent: THREE.Object3D,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
  kind:
    | "highland"
    | "juniper"
    | "cybertruck"
    | "cybercab"
    | "heritage-3"
    | "heritage-s",
) {
  if (kind === "highland") {
    const { dash, display, trim } = kitMaterials(materials, "landscape");
    const brow = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.035, 0.16), dash);
    brow.position.set(0, 0.8, -0.55);
    add(parent, brow, "highland_dash_brow");
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.012), display);
    screen.position.set(0, 0.9, -0.62);
    screen.rotation.x = -0.28;
    add(parent, screen, "highland_screen");
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.012, 0.016), trim);
    strip.position.set(0, 0.78, -0.5);
    add(parent, strip, "highland_dash_trim");
    return;
  }
  if (kind === "juniper") {
    const cam = interiorCamera("model-y");
    const mats = kitMaterials(materials, "landscape");
    faced(parent, mats.dash, "juniper_cabin_dash", cam, 0.02, -0.1, 1.02, 0.58, 0.26, 0.04);
    faced(parent, mats.display, "juniper_cabin_screen", cam, 0.02, -0.02, 0.94, 0.4, 0.15, 0.012);
    faced(parent, mats.trim, "juniper_cabin_trim", cam, 0.02, -0.24, 1.0, 0.5, 0.035, 0.012);
    seatInView(parent, mats, "juniper_cabin_l", cam, -0.5, -0.42, 0.7);
    seatInView(parent, mats, "juniper_cabin_r", cam, 0.5, -0.42, 0.7);
    return;
  }
  if (kind === "cybertruck") {
    const cam = interiorCamera("cybertruck");
    const mats = kitMaterials(materials, "landscape");
    faced(parent, mats.dash, "cybertruck_cabin_dash", cam, 0.06, -0.1, 0.62, 0.7, 0.28, 0.045);
    faced(parent, mats.dash, "cybertruck_cabin_blade", cam, 0.06, 0.16, 0.66, 0.78, 0.055, 0.018);
    faced(parent, mats.trim, "cybertruck_cabin_cheek_l", cam, -0.58, -0.02, 0.58, 0.2, 0.62, 0.02);
    faced(parent, mats.trim, "cybertruck_cabin_cheek_r", cam, 0.62, -0.02, 0.58, 0.2, 0.62, 0.02);
    faced(parent, mats.display, "cybertruck_cabin_screen", cam, 0.12, 0.0, 0.54, 0.34, 0.15, 0.012);
    yokeInView(parent, mats.trim, cam, -0.22, -0.02, 0.46);
    seatInView(parent, mats, "cybertruck_cabin_l", cam, -0.46, -0.32, 0.5);
    seatInView(parent, mats, "cybertruck_cabin_r", cam, 0.48, -0.32, 0.5);
    return;
  }
  if (kind === "cybercab") {
    const { trim } = kitMaterials(materials, "landscape");
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.012, 0.016), trim);
    strip.position.set(0, 0.78, -0.86);
    add(parent, strip, "cybercab_dash_trim");
    return;
  }
  const model: ModelId = kind === "heritage-s" ? "model-s-heritage" : "model-3-heritage";
  const cam = interiorCamera(model);
  const mats = kitMaterials(materials, "portrait");
  const dashDepth = kind === "heritage-s" ? 0.98 : 1.04;
  faced(parent, mats.dash, "heritage_dash", cam, 0.12, -0.08, dashDepth, 0.66, 0.34, 0.05);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(viewSpan(dashDepth, 0.64), 0.04, viewSpan(dashDepth, 0.16)),
    mats.dash,
  );
  put(parent, cap, "heritage_dash_cap", onInteriorView(cam, 0.12, 0.08, dashDepth - 0.03));
  faced(parent, mats.display, "heritage_screen", cam, 0.16, 0.02, dashDepth - 0.08, 0.2, 0.36, 0.012);
  if (kind === "heritage-s") {
    const clusterMat = kitMaterials(materials, "cluster").display;
    faced(parent, clusterMat, "heritage_cluster", cam, -0.14, 0.08, dashDepth - 0.07, 0.24, 0.1, 0.01);
  }
  faced(parent, mats.trim, "heritage_trim", cam, 0.12, -0.26, dashDepth - 0.02, 0.56, 0.032, 0.012);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(viewSpan(0.85, 1.1), 0.03, viewSpan(0.85, 0.7)),
    mats.carpet,
  );
  put(parent, floor, "heritage_floor", onInteriorView(cam, 0.05, -0.58, 0.85));
  seatInView(parent, mats, "heritage_l", cam, -0.46, -0.4, 0.72);
  seatInView(parent, mats, "heritage_r", cam, 0.46, -0.4, 0.72);
}
