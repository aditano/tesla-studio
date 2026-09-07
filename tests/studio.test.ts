import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VEHICLES, featuresForVehicle } from "../src/studio/catalog";
import { useStudio } from "../src/studio/store";
import { SHOTS, shotFor } from "../src/studio/scene/shots";
import { coachwork } from "../src/studio/vehicles/coachwork";
import { prepareHeritage, pivots, heritageOpenAngles } from "../src/studio/vehicles/HeritageVehicle";
for (const vehicle of VEHICLES) {
  useStudio.getState().setModel(vehicle.id);
  for (const variant of vehicle.variants) {
    useStudio.getState().setVariant(variant.id);
    for (const feature of featuresForVehicle(vehicle, variant.id)) {
      assert.ok(SHOTS[feature.id], `${vehicle.id}/${feature.id}: camera shot missing`);
      assert.ok(shotFor(vehicle.id, feature.id), `${vehicle.id}/${feature.id}: model shot missing`);
      useStudio.getState().setFeature(feature.id);
      assert.equal(useStudio.getState().feature, feature.id);
      assert.equal(useStudio.getState().autoRotate, false);
      assert.equal(useStudio.getState().demoFeature, null, "Animation must wait for the camera");
    }
  }
  useStudio.getState().resetPose();
  assert.equal(useStudio.getState().feature, null);
  assert.ok(Object.values(useStudio.getState().open).every(v => !v));
  const paint = useStudio.getState().exteriorId;
  useStudio.getState().setExterior("invalid");
  assert.equal(useStudio.getState().exteriorId, paint);
}
useStudio.getState().setModel("model-3");
useStudio.getState().setVariant("p");
useStudio.getState().setFeature("performance");
useStudio.getState().setVariant("rwd");
assert.equal(useStudio.getState().feature, null, "Removing a performance trim must close its tour");
useStudio.getState().setFeature("butterfly");
assert.equal(useStudio.getState().feature, null, "Cross-model features must be rejected");
useStudio.getState().setModel("cybertruck");
useStudio.getState().setFeature("suspension");
useStudio.getState().setDemoFeature("suspension");
useStudio.getState().setModel("model-y");
assert.equal(useStudio.getState().demoFeature, null);
console.log("PASS: every model/trim/feature, invalid selections, camera coverage, reset and model-switch isolation");
function checkGeometry(g: THREE.BufferGeometry) {
  const p = g.getAttribute("position"),
    n = g.getAttribute("normal");
  assert.ok(p.count > 0);
  assert.ok(n);
  for (const key of ["position", "normal"]) for (const value of g.getAttribute(key).array) assert.ok(Number.isFinite(value), "Non-finite geometry");
  const index = g.getIndex();
  assert.ok(index);
  assert.equal(index.count % 3, 0);
  for (const value of index.array) assert.ok(value >= 0 && value < p.count);
}
for (const crossover of [false, true]) {
  const pieces = coachwork(crossover);
  for (const [key, geometries] of Object.entries(pieces)) {
    assert.ok(geometries.length > 0, `Missing ${key}`);
    for (const g of geometries) {
      checkGeometry(g);
      g.dispose();
    }
  }
}
console.log("PASS: sedan and crossover body, door, glass, hood and hatch geometry");
// Load the actual glTF buffers through Three.js. Textures are stubbed only for this headless geometry check.
(globalThis as any).self = globalThis;
(globalThis as any).ProgressEvent = class {
  constructor(public type: string, public init: unknown) {}
};
for (const model of ["model-3-heritage", "model-s-heritage"]) {
  const path = `public/models/${model}/`;
  const json = JSON.parse(await fs.readFile(path + "scene.gltf", "utf8"));
  for (const buffer of json.buffers) {
    const b = await fs.readFile(path + buffer.uri);
    assert.equal(b.byteLength, buffer.byteLength);
    buffer.uri = "data:application/octet-stream;base64," + b.toString("base64");
  }
  for (const image of json.images ?? []) await fs.access(path + image.uri);
  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.(png|jpe?g)$/i, {
    load(_url: string, onLoad: (t: THREE.Texture) => void) {
      const t = new THREE.Texture();
      queueMicrotask(() => onLoad(t));
      return t;
    }
  } as any);
  const loader = new GLTFLoader(manager);
  const asset = await loader.parseAsync(JSON.stringify(json), "");
  const prepared = prepareHeritage(asset.scene, model);
  // Use indexed vertices: partitioned geometries retain unused source vertices.
  for (const panel of ["hood", "hatch"] as const) {
    const point = new THREE.Vector3();
    let closedY = 0, openY = 0, count = 0;
    const rotation = new THREE.Matrix4().makeRotationX(heritageOpenAngles[panel]);
    prepared.panels[panel].traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const positions = o.geometry.getAttribute("position");
      for (const i of o.geometry.index!.array) {
        point.fromBufferAttribute(positions, i);
        closedY += point.y + pivots[panel][1];
        openY += point.applyMatrix4(rotation).y + pivots[panel][1];
        count++;
      }
    });
    assert.ok(openY / count > closedY / count + 0.1, `${model}/${panel} must open upward`);
  }
  let triangles = 0;
  const box = new THREE.Box3();
  for (const [key, group] of Object.entries(prepared.panels)) {
    assert.ok(group.children.length, `${model}/${key} missing`);
    group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        checkGeometry(o.geometry);
        triangles += o.geometry.index!.count / 3;
        o.geometry.computeBoundingBox();
        box.union(o.geometry.boundingBox!);
        o.geometry.dispose();
      }
    });
  }
  assert.ok(triangles > 10000, `${model} missing mesh detail`);
  assert.ok(box.getSize(new THREE.Vector3()).length() < 12, "Normalization failed");
  prepared.materials.forEach(m => m.dispose());
  console.log(`PASS: ${model}, ${triangles.toLocaleString()} triangles, textures present, 5 articulated groups`);
}

// Use the same bundled decoder as Drei. This catches incompatible compression versions.
const {
  MeshoptDecoder,
  GLTFLoader: RuntimeGLTFLoader
} = await import('three-stdlib');
const {
  cloneAuthored
} = await import('../src/studio/vehicles/AuthoredVehicle');
const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
await decoder.ready;
const authoredManifest = JSON.parse(await fs.readFile('public/models/authored/manifest.json', 'utf8'));
for (const [model, entry] of Object.entries(authoredManifest.vehicles) as [string, any][]) {
  const bytes = await fs.readFile(`public/models/authored/${model}.glb`);
  assert.equal(bytes.length, entry.bytes);
  assert.ok(bytes.length < 3_000_000, 'Asset exceeds mobile transfer budget');
  const loader = new RuntimeGLTFLoader();
  loader.setMeshoptDecoder(decoder);
  const loaded = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const instance = cloneAuthored(loaded.scene);
  for (const name of entry.rig) assert.ok(instance.scene.getObjectByName(name), `${model}: missing ${name}`);
  let triangles = 0,
    meshes = 0;
  instance.scene.traverse(o => {
    if (o instanceof THREE.Mesh) {
      checkGeometry(o.geometry);
      triangles += o.geometry.index!.count / 3;
      meshes++;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.name === "glass") {
          assert.equal((m as THREE.MeshPhysicalMaterial).transmission, 0, `${model}: glass must not use volume transmission`);
        }
      }
    }
  });
  assert.equal(triangles, entry.triangles);
  assert.equal(meshes, entry.meshes);
  assert.ok(meshes < 130);
  const center = (o: THREE.Object3D) => {
    o.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  };
  const hood = instance.scene.getObjectByName('hood')!;
  const hoodBefore = center(hood).y;
  hood.rotation.x = .82;
  assert.ok(center(hood).y > hoodBefore + .15, 'Hood must open upward');
  hood.rotation.x = 0;
  const gate = instance.scene.getObjectByName('tailgate')!;
  const before = center(gate).y;
  gate.rotation.x = model === 'cybertruck' ? Math.PI / 2 : -1.05;
  assert.ok(model === 'cybertruck' ? center(gate).y < before : center(gate).y > before, 'Rear opening direction');
  if (model === 'cybercab') {
    const door = instance.scene.getObjectByName('door_fl')!;
    const y = center(door).y;
    door.rotation.z = -1.12;
    assert.ok(center(door).y > y, 'Butterfly door must rise');
  }
  const wheelA = instance.scene.getObjectByName('wheel_fl')!,
    wheelB = instance.scene.getObjectByName('wheel_rl')!;
  assert.ok(Math.abs(wheelB.position.z - wheelA.position.z - entry.wheelbase) < .0001);
  instance.materials.forEach(m => m.dispose());
  console.log(`PASS: ${model}, compressed decode, ${triangles.toLocaleString()} triangles, ${meshes} meshes, named hinges and opening directions`);
}

// Validate the imported Highland, including real texture paths and its presentation rig.
const { prepareHighland } = await import('../src/studio/vehicles/highland');
const highlandBytes = await fs.readFile('public/models/highland/model.glb');
const highlandJson = JSON.parse(highlandBytes.subarray(20, 20 + highlandBytes.readUInt32LE(12)).toString());
for (const image of highlandJson.images) await fs.access('public/models/highland/' + image.uri);
const textureManager = new THREE.LoadingManager();
textureManager.addHandler(/\.(png|jpe?g)$/i, { load(_url: string, done: (t: THREE.Texture) => void) { const texture = new THREE.Texture(); queueMicrotask(() => done(texture)); return texture; } } as any);
const highlandLoader = new RuntimeGLTFLoader(textureManager); highlandLoader.setMeshoptDecoder(decoder);
const highlandSource = await highlandLoader.parseAsync(highlandBytes.buffer.slice(highlandBytes.byteOffset, highlandBytes.byteOffset + highlandBytes.byteLength), '');
const highland = prepareHighland(highlandSource.scene);
assert.equal(highland.materials.get("Ln7Mtl|interior_leather")?.name, "interior_leather",
  "Highland white seats must respond to interior selection");
assert.equal(highland.materials.get("Ln7Mtl|headlight_led")?.name, "headlight_led",
  "Shared white source material must retain independent headlights");
let originalTriangles = 0, importedTriangles = 0;
highlandSource.scene.traverse(o => { if (o instanceof THREE.Mesh) originalTriangles += o.geometry.index!.count / 3; });
highland.scene.traverse(o => { if (o instanceof THREE.Mesh) { checkGeometry(o.geometry); if (!o.userData.presentationDetail) importedTriangles += o.geometry.index!.count / 3; assert.ok(o.geometry.getAttribute('uv')); if ((o.material as THREE.MeshPhysicalMaterial).name === 'glass') assert.equal((o.material as THREE.MeshPhysicalMaterial).transmission, 0); } });
assert.equal(importedTriangles, originalTriangles, 'Rig must preserve every source triangle');
assert.ok(originalTriangles > 150000);
const size = new THREE.Box3().setFromObject(highland.scene).getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z - 4.72) < .001 && size.y > 1.35 && size.y < 1.5 && size.x < 2.15, 'Correct scale and orientation');
for (const name of ['body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
 const node = highland.scene.getObjectByName(name)!;
 assert.ok(node.children.length, `Highland rig missing ${name}`);
}
assert.ok(highland.staticBody, 'Highland must keep the artist body intact');
for (const name of ['hood', 'tailgate', 'door_fl', 'charge_port']) {
 assert.equal(highland.scene.getObjectByName(name), undefined, `Highland must not invent a ${name} hinge`);
}
highland.materials.forEach(m => m.dispose());
highland.scene.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
console.log(`PASS: Highland artist asset, ${originalTriangles.toLocaleString()} preserved triangles, textures, scale and static body`);

const { prepareImported } = await import('../src/studio/vehicles/imported');
for (const spec of [
  { id: 'juniper', file: 'public/models/juniper/model.glb', min: 200000, length: 4.794, maxWidth: 2.3, minHeight: 1.4, wheels: true },
  { id: 'cybertruck-import', file: 'public/models/cybertruck-import/model.glb', min: 50000, length: 5.6829, maxWidth: 2.4, minHeight: 1.5, wheels: false },
] as const) {
  const bytes = await fs.readFile(spec.file);
  const loader = new RuntimeGLTFLoader();
  loader.setMeshoptDecoder(decoder);
  const loaded = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const prepared = prepareImported(loaded.scene, spec.id);
  let triangles = 0;
  prepared.scene.traverse(o => {
    if (o instanceof THREE.Mesh) {
      checkGeometry(o.geometry);
      triangles += o.geometry.index!.count / 3;
    }
  });
  assert.ok(triangles > spec.min, `${spec.id} missing mesh detail (${triangles})`);
  const size = new THREE.Box3().setFromObject(prepared.scene).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.z - spec.length) < 0.02, `${spec.id} length ${size.z}`);
  assert.ok(size.x < spec.maxWidth && size.y > spec.minHeight, `${spec.id} bounds ${size.x.toFixed(2)}x${size.y.toFixed(2)}`);
  assert.ok(prepared.staticBody);
  assert.ok(prepared.scene.getObjectByName('body'));
  if (spec.wheels) {
    for (const name of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
      assert.ok(prepared.scene.getObjectByName(name), `${spec.id} missing ${name}`);
    }
  }
  prepared.materials.forEach(m => m.dispose());
  console.log(`PASS: ${spec.id}, ${triangles.toLocaleString()} triangles, ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)} m`);
}


await import("./model-imports.test");
