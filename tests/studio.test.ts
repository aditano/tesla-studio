import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VEHICLES, featuresForVehicle } from "../src/studio/catalog";
import { useStudio } from "../src/studio/store";
import { SHOTS } from "../src/studio/scene/shots";
import { coachwork } from "../src/studio/vehicles/coachwork";
import { prepareHeritage } from "../src/studio/vehicles/HeritageVehicle";
for (const vehicle of VEHICLES) {
  useStudio.getState().setModel(vehicle.id);
  for (const variant of vehicle.variants) {
    useStudio.getState().setVariant(variant.id);
    for (const feature of featuresForVehicle(vehicle, variant.id)) {
      assert.ok(SHOTS[feature.id], `${vehicle.id}/${feature.id}: camera shot missing`);
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
    }
  });
  assert.equal(triangles, entry.triangles);
  assert.equal(meshes, entry.meshes);
  assert.ok(meshes < 100);
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
