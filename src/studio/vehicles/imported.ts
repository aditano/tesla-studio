import * as THREE from "three";
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

/** Bulky taillight extrusions read as glowing blocks. The front lamps are
 * split separately so only their forward skin stays emissive. */
function refineImportedRole(
  role: string,
  _center: THREE.Vector3,
  size: THREE.Vector3,
) {
  if (role === "taillight_led" && size.z > 0.35 && size.y > 0.12)
    return "lamp_housing";
  return role;
}

/** How far behind the nose a triangle still counts as the lamp face. */
const LAMP_SKIN = 0.04;

function takeTriangles(
  geometry: THREE.BufferGeometry,
  keep: (centroid: THREE.Vector3) => boolean,
) {
  const srcPos = geometry.getAttribute("position");
  const srcNormal = geometry.getAttribute("normal");
  const srcUv = geometry.getAttribute("uv");
  const index = geometry.index;
  const triCount = index ? index.count : srcPos.count;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const centroid = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let i = 0; i < triCount; i += 3) {
    const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    centroid.set(0, 0, 0);
    for (const id of ids) centroid.add(vertex.fromBufferAttribute(srcPos, id));
    centroid.multiplyScalar(1 / 3);
    if (!keep(centroid)) continue;
    for (const id of ids) {
      positions.push(srcPos.getX(id), srcPos.getY(id), srcPos.getZ(id));
      if (srcNormal)
        normals.push(srcNormal.getX(id), srcNormal.getY(id), srcNormal.getZ(id));
      if (srcUv) uvs.push(srcUv.getX(id), srcUv.getY(id));
    }
  }
  if (!positions.length) return null;
  const next = new THREE.BufferGeometry();
  next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length)
    next.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  else next.computeVertexNormals();
  if (uvs.length === (positions.length / 3) * 2)
    next.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const ids = new Uint32Array(positions.length / 3);
  for (let i = 0; i < ids.length; i++) ids[i] = i;
  next.setIndex(new THREE.BufferAttribute(ids, 1));
  next.computeBoundingSphere();
  return next;
}

/** Juniper exported each lamp as a deep emissive extrusion, so the whole
 * volume glowed as a fascia wall. Keep a thin forward skin as the LED and
 * turn the depth into a dark housing. Upper skin is the light bar; the
 * lower skins are the corner projectors (one mesh holds both sides). */
function splitFrontLamp(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const minZ = geometry.boundingBox?.min.z ?? 0;
  const skin = minZ + LAMP_SKIN;
  const pieces: { role: string; geometry: THREE.BufferGeometry }[] = [];
  const upper = takeTriangles(
    geometry,
    (c) => c.z <= skin && c.y > 0.72,
  );
  const lower = takeTriangles(
    geometry,
    (c) => c.z <= skin && c.y <= 0.72,
  );
  const housing = takeTriangles(geometry, (c) => c.z > skin);
  if (upper) pieces.push({ role: "signature_led", geometry: upper });
  if (lower) pieces.push({ role: "headlight_led", geometry: lower });
  if (housing) pieces.push({ role: "lamp_housing", geometry: housing });
  if (!pieces.length) return null;
  geometry.dispose();
  return pieces;
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
    material.metalness = 1;
    material.roughness = 0.3;
    material.envMapIntensity = 1.35;
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
    material.metalness = 0.08;
    material.roughness = 0.24;
    material.emissive.set("#f4f8ff");
    material.emissiveIntensity = 0;
    material.color.set("#d5deea");
    material.toneMapped = true;
    // Directly visible skins. Highland's buried reflector uses a higher gain.
    material.userData.lampGain = role === "signature_led" ? 1.45 : 2.05;
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

/** Presentation wrapper for Sketchfab imports that already sit on +Y up, -Z forward. */
export function prepareImported(source: THREE.Group, model: string) {
  source.updateMatrixWorld(true);
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
    if (!(object instanceof THREE.Mesh)) return;
    const originals = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Names describe customization roles, not material identity. Two trim
    // materials can share a role while retaining different textures or finishes.
    const adopt = (original: THREE.Material, role: string) => {
      const key = original.uuid + "|" + role;
      let material = materials.get(key);
      if (!material) {
        material = new THREE.MeshPhysicalMaterial();
        if (original instanceof THREE.MeshPhysicalMaterial)
          material.copy(original);
        else THREE.MeshStandardMaterial.prototype.copy.call(material, original);
        material.name = role;
        treatImported(material, role);
        materials.set(key, material);
      }
      return material;
    };
    // Flatten the hierarchy into the presentation rig without losing the
    // source node's translation, rotation or scale.
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
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
    const inferred = inferRole(originals[0]?.name ?? "", object.name);
    const frontLamp =
      originals.length === 1 &&
      inferred === "signature_led" &&
      center.z < -1.35 &&
      size.z > 0.15 &&
      size.x > 0.8;
    const pieces = frontLamp ? splitFrontLamp(geometry) : null;
    const jobs = pieces ?? [
      {
        role: refineImportedRole(inferred, center, size),
        geometry,
      },
    ];
    // Multi-material meshes keep one geometry and a material per slot.
    // Front lamps are single-material extrusions and are split above.
    if (!pieces && originals.length > 1) {
      const material = originals.map((original) =>
        adopt(
          original,
          refineImportedRole(inferRole(original.name, object.name), center, size),
        ),
      );
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      groups[part].add(mesh);
      return;
    }
    for (const piece of jobs) {
      const material = adopt(originals[0], piece.role);
      piece.geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(piece.geometry, material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      groups[part].add(mesh);
    }
  });

  if (model === "juniper" || model === "model-y")
    addPerformanceSpoiler(body, materials);

  return {
    scene,
    materials,
    ownsGeometry: true,
    staticBody: true,
    model,
  };
}
