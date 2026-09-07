import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Presentation rig for RBLXSupercars' static Highland mesh.
 * The source is a merged Sketchfab export, not a factory hinge rig.
 * Only wheels are separated. Body paint stays intact so door/hood
 * demonstrations cannot tear the exterior. */
export function prepareHighland(source: THREE.Group) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 4.72 / (bounds.max.x - bounds.min.x);
  const transform = new THREE.Matrix4()
    .makeRotationY(Math.PI / 2)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(
      new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z),
    );
  const scene = new THREE.Group();
  const body = new THREE.Group();
  body.name = "body";
  scene.add(body);
  const origins: Record<string, [number, number, number]> = {
    wheel_fl: [-0.81, 0.345, -1.49],
    wheel_fr: [0.81, 0.345, -1.49],
    wheel_rl: [-0.81, 0.345, 1.385],
    wheel_rr: [0.81, 0.345, 1.385],
  };
  const groups: Record<string, THREE.Group> = { body };
  for (const [name, position] of Object.entries(origins)) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    groups[name] = group;
    scene.add(group);
  }
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material as THREE.MeshStandardMaterial;
    const name = original.name;
    const geometry = object.geometry
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(transform, object.matrixWorld),
      );
    const pos = geometry.getAttribute("position");
    const index = geometry.index;
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
      const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
      const [x, y, z] = ["X", "Y", "Z"].map(
        (axis) =>
          ids.reduce((sum, j) => sum + (pos as any)["get" + axis](j), 0) / 3,
      );
      let part = "body";
      const wheelMaterial =
        /Tire1|Georimblurlfsub021/.test(name) ||
        (/Georimblurlfsub01/.test(name) && y < 0.65);
      if (
        wheelMaterial &&
        Math.abs(x) > 0.7 &&
        Math.min(Math.abs(z + 1.49), Math.abs(z - 1.385)) < 0.4
      ) {
        part = "wheel_" + (z < 0 ? "f" : "r") + (x < 0 ? "l" : "r");
      }
      let role = name;
      if (name === "Geohoodsub00021Mtl") role = "exterior_paint";
      if (name === "Georimblurlfsub021Mtl") role = "wheel_finish";
      if (name === "Ln7Mtl" && z < -1.75 && y > 0.45 && y < 0.95)
        role = "headlight_led";
      if (name === "Geodoorl2intsub651Mtl") role = "interior_leather";
      if (
        /Georimblurlfsub01/.test(name) &&
        Math.abs(x) < 0.63 &&
        z > -0.55 &&
        z < 1.07 &&
        y > 0.32 &&
        y < 1.03
      )
        role = "interior_leather";
      if (/window|extwindow/i.test(name)) role = "glass";
      const key = part + "|" + role;
      const list = buckets.get(key) ?? [];
      list.push(...ids);
      buckets.set(key, list);
    }
    for (const [key, ids] of buckets) {
      const [part, role] = key.split("|");
      const materialKey = name + "|" + role;
      let material = materials.get(materialKey);
      if (!material) {
        material = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(material, original);
        material.name = role;
        material.side = THREE.DoubleSide;
        if (role === "exterior_paint") {
          material.metalness = 0.28;
          material.roughness = 0.22;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.06;
        }
        if (role === "wheel_finish") {
          material.metalness = 0.9;
          material.roughness = 0.28;
        }
        if (role === "glass" || material.transparent) {
          material.transparent = true;
          material.roughness = 0.08;
          material.metalness = 0.05;
          material.opacity = 0.38;
          material.transmission = 0;
          material.clearcoat = 1;
          material.clearcoatRoughness = 0.04;
          material.depthWrite = false;
        }
        if (/Geocockpithrsub000/.test(name)) material.emissiveIntensity = 0.6;
        if (role === "headlight_led") {
          material.emissive.set("#edf5ff");
          material.emissiveIntensity = 2.5;
        }
        materials.set(materialKey, material);
      }
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
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      groups[part].add(mesh);
    }
    geometry.dispose();
  });
  const spoiler = new THREE.Group();
  spoiler.name = "performance_spoiler";
  spoiler.userData.presentationDetail = true;
  const carbon = new THREE.MeshPhysicalMaterial({
    color: "#171b20",
    roughness: 0.3,
    metalness: 0.35,
    clearcoat: 1,
  });
  materials.set("performance_spoiler", carbon);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.69, 0.95, 2.16),
    new THREE.Vector3(0, 0.977, 2.18),
    new THREE.Vector3(0.69, 0.95, 2.16),
  ]);
  const lip = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, 0.012, 6, false),
    carbon,
  );
  lip.userData.presentationDetail = true;
  lip.castShadow = true;
  spoiler.add(lip);
  body.add(spoiler);
  spoiler.visible = false;
  return {
    scene,
    materials,
    ownsGeometry: true,
    staticBody: true,
  };
}
