import * as THREE from "three";
import { addFrunkTub, articulate, panelSpecs } from "./articulate";
const KNOWN_ROLES = new Set([
  "exterior_paint",
  "exterior_steel",
  "glass",
  "lamp_lens",
  "tire_rubber",
  "wheel_finish",
  "brake_caliper",
  "brake_rotor",
  "interior_leather",
  "signature_led",
  "headlight_led",
  "taillight_led",
  "satin_trim",
  "display",
  "carpet",
  "dashboard",
]);

let brushed: THREE.DataTexture | null = null;
/** Horizontal grain so the stainless shell reads as brushed metal, not flat silver. */
function brushedSteel() {
  if (brushed) return brushed;
  const w = 64;
  const h = 64;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const band = 168 + (y % 4) * 18;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const grain = ((x * 17 + y * 3) % 11) - 5;
      const c = Math.max(0, Math.min(255, band + grain));
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = Math.min(255, c + 6);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, w, h);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  brushed = texture;
  return texture;
}

const WHEEL_ROLES =
  /^(tire_rubber|wheel_finish|brake_rotor|brake_caliper)$/;

function inferRole(materialName: string, objectName: string) {
  if (KNOWN_ROLES.has(materialName)) return materialName;
  const hay = `${materialName} ${objectName}`.toLowerCase();
  if (/glass|window|windshield|sunroof|pano/.test(hay)) return "glass";
  if (/tire|tyre|rubber/.test(hay)) return "tire_rubber";
  if (/caliper/.test(hay)) return "brake_caliper";
  if (/rotor|brake.?disc/.test(hay)) return "brake_rotor";
  if (/wheel|rim|alloy/.test(hay)) return "wheel_finish";
  if (/leather|seat|interior|cabin|upholstery/.test(hay))
    return "interior_leather";
  if (/headlight|headlamp|projector/.test(hay)) return "headlight_led";
  if (/signature|light.?bar|drl/.test(hay)) return "signature_led";
  if (/tail.?light|rear.?lamp/.test(hay)) return "taillight_led";
  if (/lens/.test(hay)) return "lamp_lens";
  if (/steel|stainless/.test(hay)) return "exterior_steel";
  if (/paint|carpaint|body.?colou?r/.test(hay)) return "exterior_paint";
  return materialName || "satin_trim";
}

/** Juniper's front lamps were exported as fascia-deep blocks. Lighting the
 * whole volume reads as a glowing wall, so those meshes stay dark housings.
 * A thin segmented blade is drawn on the front face instead. */
function refineImportedRole(
  role: string,
  center: THREE.Vector3,
  size: THREE.Vector3,
) {
  if (role === "signature_led" && center.z < -1.4 && size.x > 0.8)
    return "lamp_housing";
  if (role === "taillight_led" && size.z > 0.35 && size.y > 0.12)
    return "lamp_housing";
  return role;
}

function treatImported(material: THREE.MeshPhysicalMaterial, role: string) {
  material.side = THREE.DoubleSide;
  if (role === "exterior_paint") {
    material.metalness = 0.26;
    material.roughness = 0.22;
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.055;
    material.envMapIntensity = 1.18;
    material.sheen = 0.18;
    material.sheenRoughness = 0.4;
    material.sheenColor.set("#d8dee6");
  }
  if (role === "exterior_steel") {
    material.map = brushedSteel();
    material.color.set("#d4d8de");
    material.metalness = 0.96;
    material.roughness = 0.34;
    material.envMapIntensity = 1.15;
    material.clearcoat = 0.22;
    material.clearcoatRoughness = 0.32;
  }
  // The GLB declares KHR_materials_anisotropy, but the meshes carry no
  // tangents. three.js then derives them per pixel, which is unstable on flat
  // panels: it shows as rainbow banding and, in the worst case, NaN pixels
  // that the bloom pass spreads across the whole frame.
  if (!material.userData.hasTangents) {
    material.anisotropy = 0;
    material.anisotropyMap = null;
  }
  if (role === "glass" || role === "lamp_lens") {
    material.transparent = true;
    material.transmission = 0;
    material.thickness = 0;
    material.depthWrite = role === "glass";
    material.roughness = 0.06;
    material.metalness = 0.04;
    material.clearcoat = 1;
    material.clearcoatRoughness = 0.05;
    material.envMapIntensity = 1.35;
    material.side = THREE.FrontSide;
    material.emissive.set("#000000");
    material.emissiveIntensity = 0;
    if (role === "glass") {
      material.opacity = 0.32;
      if (material.color.getHSL({ h: 0, s: 0, l: 0 }).l > 0.55)
        material.color.set("#6a8898");
    } else {
      material.opacity = 0.42;
      material.color.set("#5c7384");
    }
  }
  if (role === "tire_rubber") {
    material.metalness = 0;
    material.roughness = 0.92;
    material.envMapIntensity = 0.2;
  }
  if (role === "wheel_finish") {
    material.metalness = 0.9;
    material.roughness = 0.28;
    material.envMapIntensity = 1.05;
  }
  if (role === "brake_caliper") {
    material.metalness = 0.4;
    material.roughness = 0.32;
  }
  if (role === "brake_rotor") {
    material.metalness = 0.88;
    material.roughness = 0.45;
  }
  if (role === "interior_leather") {
    material.metalness = 0;
    material.roughness = 0.52;
    material.sheen = 0.48;
    material.sheenRoughness = 0.36;
    material.sheenColor.set("#c8c4bc");
    material.envMapIntensity = 0.7;
  }
  if (role === "lamp_housing") {
    material.transparent = false;
    material.opacity = 1;
    material.color.set("#12161b");
    material.emissive.set("#000000");
    material.emissiveIntensity = 0;
    material.metalness = 0.32;
    material.roughness = 0.42;
    material.envMapIntensity = 0.55;
  }
  if (role === "headlight_led" || role === "signature_led") {
    material.transparent = false;
    material.opacity = 1;
    material.metalness = 0.12;
    material.roughness = 0.2;
    material.emissive.set("#edf5ff");
    material.emissiveIntensity = 4.8;
    material.color.set("#e8f1ff");
  }
  if (role === "taillight_led") {
    material.transparent = false;
    material.opacity = 1;
    material.metalness = 0.16;
    material.roughness = 0.24;
    material.emissive.set("#ed1828");
    material.emissiveIntensity = 3.2;
  }
}

function addPerformanceSpoiler(
  body: THREE.Group,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  const spoiler = new THREE.Group();
  spoiler.name = "performance_spoiler";
  spoiler.userData.presentationDetail = true;
  const carbon = new THREE.MeshPhysicalMaterial({
    color: "#171b20",
    roughness: 0.3,
    metalness: 0.35,
    clearcoat: 1,
  });
  carbon.name = "performance_spoiler";
  materials.set("performance_spoiler", carbon);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.76, 1.286, 2.155),
    new THREE.Vector3(0, 1.298, 2.175),
    new THREE.Vector3(0.76, 1.286, 2.155),
  ]);
  const lip = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, 0.013, 6, false),
    carbon,
  );
  lip.userData.presentationDetail = true;
  lip.castShadow = true;
  spoiler.add(lip);
  body.add(spoiler);
  spoiler.visible = false;
}

/** Owner-manual body width (mirrors folded) for the Cybertruck import. */
const CYBERTRUCK_BODY_WIDTH = 2.0316;

/** Corrections for export defects in a source mesh. The Nieve5677
 * Cybertruck ships three detached 48-triangle blocks floating over the
 * cab, and its body is off-centre and narrowed to about 1.5 m. The stray
 * blocks are dropped, and the body is centred and widened to the manual
 * width. Length and height already match the owner manual. */
function importFit(source: THREE.Group, model: string) {
  const skip = new Set<THREE.Object3D>();
  const matrix = new THREE.Matrix4();
  if (!model.startsWith("cybertruck")) return { skip, matrix };
  const all = new THREE.Box3().setFromObject(source);
  const height = all.max.y - all.min.y;
  const body = new THREE.Box3();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const box = new THREE.Box3().setFromObject(object);
    const triangles =
      (object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3;
    if (triangles < 500 && box.min.y > all.min.y + height * 0.6) skip.add(object);
    else body.union(box);
  });
  if (body.isEmpty()) return { skip, matrix };
  const width = body.max.x - body.min.x;
  const mid = (body.max.x + body.min.x) / 2;
  const scale = width > 0 && width < CYBERTRUCK_BODY_WIDTH ? CYBERTRUCK_BODY_WIDTH / width : 1;
  matrix
    .makeScale(scale, 1, 1)
    .multiply(new THREE.Matrix4().makeTranslation(-mid, 0, 0));
  return { skip, matrix };
}

/** Presentation wrapper for Sketchfab imports that already sit on +Y up, -Z forward. */
export function prepareImported(source: THREE.Group, model: string) {
  source.updateMatrixWorld(true);
  const fit = importFit(source, model);
  const scene = new THREE.Group();
  const body = new THREE.Group();
  body.name = "body";
  scene.add(body);
  const groups: Record<string, THREE.Group> = { body };
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  const tireCenters: THREE.Vector3[] = [];
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const mat = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    const role = inferRole((mat as THREE.Material)?.name ?? "", object.name);
    if (role !== "tire_rubber") return;
    tireCenters.push(
      new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()),
    );
  });

  const origins: Record<string, [number, number, number]> = {};
  if (tireCenters.length === 4) {
    for (const center of tireCenters) {
      const key =
        "wheel_" + (center.z < 0 ? "f" : "r") + (center.x < 0 ? "l" : "r");
      origins[key] = [center.x, center.y, center.z];
    }
  }
  for (const [name, position] of Object.entries(origins)) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    group.userData.authoredRadius = position[1];
    groups[name] = group;
    scene.add(group);
  }

  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || fit.skip.has(object)) return;
    const originals = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Names describe customization roles, not material identity. Two trim
    // materials can share a role while retaining different textures or finishes.
    const copies = originals.map((original) => {
      const inferred = inferRole(original.name, object.name);
      const role = refineImportedRole(inferred, center, size);
      const key = original.uuid + "|" + role;
      let material = materials.get(key);
      if (!material) {
        material = new THREE.MeshPhysicalMaterial();
        if (original instanceof THREE.MeshPhysicalMaterial)
          material.copy(original);
        else THREE.MeshStandardMaterial.prototype.copy.call(material, original);
        material.name = role;
        material.userData.hasTangents = !!object.geometry.getAttribute("tangent");
        treatImported(material, role);
        materials.set(key, material);
      }
      return material;
    });
    const material = Array.isArray(object.material) ? copies : copies[0];
    // Flatten the hierarchy into the presentation rig without losing the
    // source node's translation, rotation or scale.
    const geometry = object.geometry
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(fit.matrix, object.matrixWorld),
      );
    let part = "body";
    if (originals.every((m) => WHEEL_ROLES.test(inferRole(m.name, object.name)))) {
      let best = "";
      let bestDistance = 0.55;
      for (const [name, position] of Object.entries(origins)) {
        const distance = Math.hypot(
          center.x - position[0],
          center.y - position[1],
          center.z - position[2],
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = name;
        }
      }
      if (best) part = best;
    }
    const origin = origins[part];
    if (origin) geometry.translate(-origin[0], -origin[1], -origin[2]);
    geometry.computeBoundingSphere();
    if (
      model.startsWith("cybertruck") &&
      !Array.isArray(material) &&
      material.name === "exterior_steel"
    ) {
      segmentCybertruckShell(groups[part], geometry, object.name, material, materials);
      return;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    groups[part].add(mesh);
  });

  if (model === "juniper" || model === "model-y")
    addPerformanceSpoiler(body, materials);
  if (model.startsWith("cybertruck")) addCybertruckCabin(body, materials);

  const specs = panelSpecs(model);
  if (specs.length) {
    articulate(body, specs);
    const tailgate = body.getObjectByName("tailgate");
    const spoiler = body.getObjectByName("performance_spoiler");
    if (tailgate && spoiler) tailgate.attach(spoiler);
    addFrunkTub(
      body,
      model.startsWith("cybertruck") ? [0, 0.78, -1.85] : [0, 0.62, -1.52],
      model.startsWith("cybertruck") ? [1.25, 0.16, 0.85] : [1.15, 0.14, 0.7],
    );
    if (model === "juniper" || model === "model-y") addJuniperTailBar(body, materials);
    if (model.startsWith("cybertruck")) addCybertruckTailBar(body, materials);
  }

  return {
    scene,
    materials,
    ownsGeometry: true,
    staticBody: specs.length === 0,
    model,
  };
}

type ShellBucket = { positions: number[]; normals: number[]; uvs: number[] };

function shellMaterial(
  base: THREE.MeshPhysicalMaterial,
  role: string,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  const key = "cybertruck-shell|" + role;
  let material = materials.get(key);
  if (material) return material;
  material = base.clone();
  material.name = role;
  material.userData.hasTangents = false;
  material.map = role === "exterior_steel" ? material.map : null;
  treatImported(material, role);
  if (role === "satin_trim") {
    material.map = null;
    material.color.set("#0c0e12");
    material.metalness = 0.08;
    material.roughness = 0.72;
    material.envMapIntensity = 0.28;
  }
  if (role === "tire_rubber") material.color.set("#17191c");
  if (role === "wheel_finish") {
    material.color.set("#2c3238");
    material.metalness = 0.82;
    material.roughness = 0.32;
  }
  if (role === "glass") {
    material.color.set("#1a3040");
    material.opacity = 0.42;
    material.roughness = 0.05;
    material.metalness = 0.08;
  }
  if (role === "signature_led" || role === "headlight_led") material.color.set("#e7eef8");
  materials.set(key, material);
  return material;
}

/** The Nieve5677 export is one stainless shell. Split tires, glass, cladding
 * and the light bars off that shell so the truck is not a single silver material. */
function segmentCybertruckShell(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  name: string,
  base: THREE.MeshPhysicalMaterial,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  const normal = source.getAttribute("normal");
  const uv = source.getAttribute("uv");
  if (!position || !normal) {
    const mesh = new THREE.Mesh(geometry, base);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return;
  }
  const hubs: { x: number; z: number }[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      let bestX = sx * 0.86;
      let bestZ = sz * 1.82;
      let best = -1;
      let minY = Infinity;
      for (let i = 0; i < position.count; i++) {
        const px = position.getX(i);
        const pz = position.getZ(i);
        if (Math.sign(px) !== sx || Math.sign(pz) !== sz) continue;
        minY = Math.min(minY, position.getY(i));
      }
      for (let i = 0; i < position.count; i++) {
        const py = position.getY(i);
        const px = position.getX(i);
        const pz = position.getZ(i);
        if (py > minY + 0.06) continue;
        if (Math.sign(px) !== sx || Math.sign(pz) !== sz) continue;
        const score = Math.abs(px) + Math.abs(pz);
        if (score > best) {
          best = score;
          bestX = px;
          bestZ = pz;
        }
      }
      hubs.push({ x: bestX, z: bestZ });
    }
  }
  const buckets = new Map<string, ShellBucket>();
  const take = (role: string) => {
    let bucket = buckets.get(role);
    if (!bucket) {
      bucket = { positions: [], normals: [], uvs: [] };
      buckets.set(role, bucket);
    }
    return bucket;
  };
  const classify = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    for (const hub of hubs) {
      const axial = Math.abs(x - hub.x);
      const radial = Math.hypot(y - 0.445, z - hub.z);
      if (axial < 0.28 && radial > 0.3 && radial < 0.56 && y < 0.62) {
        if (radial > 0.39) return "tire_rubber";
        return "wheel_finish";
      }
      if (axial < 0.5 && radial > 0.46 && radial < 0.86 && y < 0.78 && y > 0.08)
        return "satin_trim";
    }
    if (y < 0.42 && y > 0.05 && Math.abs(x) > 0.62 && Math.abs(nx) > 0.28) return "satin_trim";
    if (ny > 0.2 && nz < -0.45 && y > 1.2 && y < 1.72 && z < -0.35 && z > -1.65 && Math.abs(x) < 0.88)
      return "glass";
    if (Math.abs(nx) > 0.45 && Math.abs(ny) < 0.55 && y > 1.28 && y < 1.58 && z > -0.9 && z < 1.15 && Math.abs(x) > 0.72)
      return "glass";
    if (nz > 0.6 && y > 1.28 && y < 1.62 && z > 0.55 && z < 1.15 && Math.abs(x) < 0.72) return "glass";
    if (y > 1.12 && y < 1.2 && z < -2.55 && Math.abs(x) < 0.78 && nz < -0.35) return "signature_led";
    if (y > 1.15 && y < 1.28 && z > 2.55 && Math.abs(x) < 0.85 && nz > 0.45) return "taillight_led";
    if (y < 0.36 && y > 0.08 && Math.abs(x) > 0.55 && Math.abs(nx) > 0.4) return "satin_trim";
    return "exterior_steel";
  };
  for (let i = 0; i < position.count; i += 3) {
    let x = 0;
    let y = 0;
    let z = 0;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < 3; k++) {
      x += position.getX(i + k);
      y += position.getY(i + k);
      z += position.getZ(i + k);
      nx += normal.getX(i + k);
      ny += normal.getY(i + k);
      nz += normal.getZ(i + k);
    }
    const role = classify(x / 3, y / 3, z / 3, nx / 3, ny / 3, nz / 3);
    const bucket = take(role);
    for (let k = 0; k < 3; k++) {
      const v = i + k;
      bucket.positions.push(position.getX(v), position.getY(v), position.getZ(v));
      bucket.normals.push(normal.getX(v), normal.getY(v), normal.getZ(v));
      bucket.uvs.push(uv ? uv.getX(v) : 0, uv ? uv.getY(v) : 0);
    }
  }
  if (source !== geometry) source.dispose();
  geometry.dispose();
  for (const [role, bucket] of buckets) {
    if (!bucket.positions.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(bucket.normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uvs, 2));
    const index = new Uint32Array(bucket.positions.length / 3);
    for (let i = 0; i < index.length; i++) index[i] = i;
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, shellMaterial(base, role, materials));
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function addCybertruckCabin(
  body: THREE.Group,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  const make = (name: string, color: string, roughness: number, metalness = 0) => {
    const key = "cybertruck-cabin|" + name;
    let material = materials.get(key);
    if (material) return material;
    material = new THREE.MeshPhysicalMaterial({ color, roughness, metalness });
    material.name = name;
    materials.set(key, material);
    return material;
  };
  const leather = make("interior_leather", "#1a1c1f", 0.55);
  const dashMat = make("dashboard", "#1c1e22", 0.62, 0.04);
  const carpet = make("carpet", "#121418", 0.95);
  const screen = make("display", "#10181c", 0.22, 0.08);
  screen.emissive.set("#7eb8c4");
  screen.emissiveIntensity = 0.55;
  const trim = make("satin_trim", "#14171c", 0.5, 0.2);
  const add = (mesh: THREE.Mesh) => {
    mesh.userData.cabin = true;
    mesh.userData.noPanel = true;
    mesh.userData.presentationDetail = true;
    mesh.castShadow = mesh.receiveShadow = true;
    body.add(mesh);
  };
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.04, 1.7), carpet);
  floor.position.set(0, 0.58, -0.35);
  add(floor);
  for (const x of [-0.42, 0.42]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.5), leather);
    cushion.position.set(x, 0.78, -0.15);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.55, 0.1), leather);
    back.position.set(x, 1.12, 0.12);
    back.rotation.x = -0.18;
    add(cushion);
    add(back);
  }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.36), dashMat);
  dash.position.set(0, 1.05, -1.05);
  add(dash);
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.02), screen);
  display.position.set(0, 1.12, -0.86);
  display.rotation.x = -0.2;
  add(display);
  const yoke = new THREE.Group();
  yoke.position.set(-0.38, 1.08, -0.72);
  yoke.rotation.x = 0.35;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.04), trim);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.04), trim);
  stem.position.y = -0.08;
  yoke.add(bar, stem);
  yoke.userData.cabin = true;
  yoke.userData.noPanel = true;
  yoke.userData.presentationDetail = true;
  yoke.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = child.receiveShadow = true;
  });
  body.add(yoke);
}

function addCybertruckTailBar(
  body: THREE.Group,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  let material = materials.get("cybertruck_tail_bar");
  if (!material) {
    material = new THREE.MeshPhysicalMaterial({
      color: "#8c0714",
      emissive: "#ed1828",
      emissiveIntensity: 3.4,
      metalness: 0.12,
      roughness: 0.28,
      anisotropy: 0,
    });
    material.name = "taillight_led";
    materials.set("cybertruck_tail_bar", material);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.035, 0.018), material);
  bar.position.set(0, 1.18, 2.72);
  bar.name = "cybertruck_tail_bar";
  bar.userData.presentationDetail = true;
  bar.userData.noPanel = true;
  body.add(bar);
  const gate = body.getObjectByName("tailgate");
  if (gate) gate.attach(bar);
}

/** Juniper's scanned rear lamp is a deep block. Replace it with the full-width blade. */
function addJuniperTailBar(
  body: THREE.Group,
  materials: Map<string, THREE.MeshPhysicalMaterial>,
) {
  body.updateMatrixWorld(true);
  let station = 2.15;
  let height = 1.05;
  body.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    const names = (Array.isArray(object.material) ? object.material : [object.material])
      .map((m) => m.name)
      .join(" ");
    if (!/taillight_led|lamp_housing|exterior_paint/.test(names)) return;
    const position = object.geometry.getAttribute("position");
    if (!position) return;
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      const x = Math.abs(point.x);
      if (x > 0.7 || point.y < 0.9 || point.y > 1.25 || point.z < 1.6) continue;
      if (point.z > station) {
        station = point.z;
        height = point.y;
      }
    }
  });
  body.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const names = (Array.isArray(object.material) ? object.material : [object.material])
      .map((m) => m.name)
      .join(" ");
    if (!/taillight_led|lamp_housing/.test(names)) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.getCenter(new THREE.Vector3()).z > 1.4) object.visible = false;
  });
  let material = materials.get("juniper_tail_bar");
  if (!material) {
    material = new THREE.MeshPhysicalMaterial({
      color: "#8c0714",
      emissive: "#ed1828",
      emissiveIntensity: 3.2,
      metalness: 0.16,
      roughness: 0.24,
    });
    material.name = "taillight_led";
    materials.set("juniper_tail_bar", material);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.045, 0.02), material);
  bar.position.set(0, Math.max(height, 1.08), station + 0.012);
  bar.name = "juniper_tail_bar";
  bar.userData.presentationDetail = true;
  bar.userData.noPanel = true;
  bar.castShadow = true;
  body.add(bar);
  const gate = body.getObjectByName("tailgate");
  if (gate) gate.attach(bar);
}
