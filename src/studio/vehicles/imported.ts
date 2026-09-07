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

/** Juniper front lighting was exported as a few oversized emissive slabs.
 * Keep the thin upper blade as the signature bar, compact lower emitters
 * as headlights, and the bulky housings as lenses. */
function refineImportedRole(
  role: string,
  center: THREE.Vector3,
  size: THREE.Vector3,
) {
  if (role === "signature_led" && center.z < -1.55) {
    if (size.y > 0.12) return "lamp_lens";
    if (center.y < 0.72 && size.y <= 0.085 && size.z <= 0.28)
      return "headlight_led";
    if (center.y < 0.72 && size.z > 0.32) return "lamp_lens";
    return "signature_led";
  }
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
  if (role === "headlight_led" || role === "signature_led") {
    material.transparent = false;
    material.opacity = 1;
    material.metalness = 0.12;
    material.roughness = 0.2;
    material.emissive.set("#edf5ff");
    material.emissiveIntensity = 2.4;
    material.color.set("#e8f1ff");
  }
  if (role === "taillight_led") {
    material.transparent = false;
    material.opacity = 1;
    material.metalness = 0.16;
    material.roughness = 0.24;
    material.emissive.set("#ed1828");
    material.emissiveIntensity = 1.45;
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
        treatImported(material, role);
        materials.set(key, material);
      }
      return material;
    });
    const material = Array.isArray(object.material) ? copies : copies[0];
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
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = object.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    groups[part].add(mesh);
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
