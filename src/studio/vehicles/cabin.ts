import * as THREE from "three";

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

function seat(
  parent: THREE.Object3D,
  materials: Kit,
  name: string,
  x: number,
  y: number,
  z: number,
  wide = 0.36,
  tall = 1,
) {
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.1, 0.42), materials.leather);
  cushion.position.set(x, y, z);
  add(parent, cushion, `${name}_cushion`);
  const back = new THREE.Mesh(new THREE.BoxGeometry(wide * 0.92, 0.58 * tall, 0.1), materials.leather);
  back.position.set(x, y + 0.36 * tall, z + 0.16);
  back.rotation.x = -0.18;
  add(parent, back, `${name}_back`);
  const rest = new THREE.Mesh(new THREE.BoxGeometry(wide * 0.42, 0.14 * tall, 0.08), materials.leather);
  rest.position.set(x, y + 0.68 * tall, z + 0.12);
  rest.rotation.x = -0.18;
  add(parent, rest, `${name}_rest`);
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
    const mats = kitMaterials(materials, "landscape");
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.018, 0.03), mats.dash);
    pad.position.set(0.04, 1.045, -0.64);
    pad.rotation.x = -0.4;
    add(parent, pad, "juniper_cabin_dash");
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.012), mats.display);
    screen.position.set(0.02, 1.0, -0.5);
    screen.rotation.x = -0.18;
    add(parent, screen, "juniper_cabin_screen");
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.012), mats.trim);
    strip.position.set(0.04, 0.94, -0.56);
    add(parent, strip, "juniper_cabin_trim");
    seat(parent, mats, "juniper_cabin_l", -0.38, 0.74, -0.42, 0.26, 0.4);
    seat(parent, mats, "juniper_cabin_r", 0.38, 0.74, -0.42, 0.26, 0.4);
    return;
  }
  if (kind === "cybertruck") {
    const mats = kitMaterials(materials, "landscape");
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.035, 0.12), mats.dash);
    shelf.position.set(0.02, 0.94, -0.34);
    add(parent, shelf, "cybertruck_cabin_dash");
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.028, 0.018), mats.dash);
    blade.position.set(0.02, 1.08, -0.4);
    blade.rotation.x = 0.12;
    add(parent, blade, "cybertruck_cabin_blade");
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.01), mats.display);
    screen.position.set(0.04, 1.01, -0.36);
    screen.rotation.x = -0.1;
    add(parent, screen, "cybertruck_cabin_screen");
    const yoke = new THREE.Group();
    yoke.name = "cybertruck_cabin_yoke";
    yoke.position.set(-0.06, 1.02, -0.12);
    yoke.userData.cabin = true;
    yoke.userData.noPanel = true;
    yoke.userData.presentationDetail = true;
    const bar = (w: number, h: number, x: number, y: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mats.trim);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      yoke.add(mesh);
    };
    bar(0.16, 0.022, 0, 0.01);
    bar(0.12, 0.02, 0, -0.07);
    bar(0.018, 0.08, -0.06, -0.03);
    bar(0.018, 0.08, 0.06, -0.03);
    parent.add(yoke);
    seat(parent, mats, "cybertruck_cabin_l", -0.2, 0.88, -0.28, 0.14, 0.28);
    seat(parent, mats, "cybertruck_cabin_r", 0.2, 0.88, -0.28, 0.14, 0.28);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.45), mats.carpet);
    floor.position.set(0.02, 0.88, -0.12);
    add(parent, floor, "cybertruck_cabin_floor");
    return;
  }
  if (kind === "cybercab") {
    const { trim } = kitMaterials(materials, "landscape");
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.012, 0.016), trim);
    strip.position.set(0, 0.78, -0.86);
    add(parent, strip, "cybercab_dash_trim");
    return;
  }
  const screenKind = kind === "heritage-s" ? "portrait" : "portrait";
  const mats = kitMaterials(materials, screenKind);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.03), mats.dash);
  dash.position.set(0.02, kind === "heritage-s" ? 0.8 : 0.78, kind === "heritage-s" ? -0.42 : -0.64);
  add(parent, dash, "heritage_dash");
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, kind === "heritage-s" ? 0.18 : 0.22, 0.012),
    mats.display,
  );
  screen.position.set(0.06, 0.88, kind === "heritage-s" ? -0.43 : -0.66);
  screen.rotation.x = -0.06;
  add(parent, screen, "heritage_screen");
  if (kind === "heritage-s") {
    const clusterMat = kitMaterials(materials, "cluster").display;
    const cluster = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.01), clusterMat);
    cluster.position.set(-0.26, 0.93, -0.44);
    cluster.rotation.x = -0.16;
    add(parent, cluster, "heritage_cluster");
  }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.012, 0.012), mats.trim);
  strip.position.set(0.02, kind === "heritage-s" ? 0.78 : 0.76, kind === "heritage-s" ? -0.4 : -0.62);
  add(parent, strip, "heritage_trim");
  seat(parent, mats, "heritage_l", -0.4, 0.7, -0.45, 0.26, 0.4);
  seat(parent, mats, "heritage_r", 0.4, 0.7, -0.45, 0.26, 0.4);
}
