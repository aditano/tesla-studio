import * as THREE from "three";

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
    if ((mat as THREE.Material)?.name !== "tire_rubber") return;
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
    const original = (
      Array.isArray(object.material) ? object.material[0] : object.material
    ) as THREE.MeshPhysicalMaterial;
    const role = original.name || "satin_trim";
    let material = materials.get(role);
    if (!material) {
      material = original.clone();
      material.name = role;
      material.side = THREE.DoubleSide;
      if (role === "glass" || role === "lamp_lens") {
        material.transparent = true;
        material.transmission = 0;
        material.depthWrite = false;
      }
      materials.set(role, material);
    }
    const geometry = object.geometry.clone();
    const center = new THREE.Box3()
      .setFromObject(object)
      .getCenter(new THREE.Vector3());
    let part = "body";
    if (
      /tire_rubber|wheel_finish|brake_rotor|brake_caliper/.test(role)
    ) {
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

  return {
    scene,
    materials,
    ownsGeometry: true,
    staticBody: true,
    model,
  };
}
