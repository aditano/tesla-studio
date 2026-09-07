import assert from "node:assert/strict";
import * as THREE from "three";
import { prepareImported } from "../src/studio/vehicles/imported";

// Exporters commonly leave transforms on parent nodes and reuse role names
// across distinct materials. Neither may be discarded when building the rig.
const source = new THREE.Group();
const parent = new THREE.Group();
parent.position.set(2, 0.5, -1);
parent.rotation.y = 0.7;
parent.scale.set(1.2, 0.8, 1.4);
source.add(parent);
const first = new THREE.MeshStandardMaterial({ color: "red", roughness: 0.2 });
const second = new THREE.MeshStandardMaterial({ color: "blue", roughness: 0.8 });
first.name = second.name = "satin_trim";
const geometry = new THREE.BoxGeometry();
const mesh = new THREE.Mesh(geometry, [first, second]);
mesh.position.set(0.2, 1, -0.3);
parent.add(mesh);
const before = new THREE.Box3().setFromObject(source, true);
const prepared = prepareImported(source, "fixture");
const after = new THREE.Box3().setFromObject(prepared.scene, true);
assert.ok(before.min.distanceTo(after.min) < 1e-6 && before.max.distanceTo(after.max) < 1e-6,
  "Imported node transforms must survive flattening");
const copy = prepared.scene.getObjectByName("body")!.children[0] as THREE.Mesh;
assert.ok(Array.isArray(copy.material));
assert.equal(copy.material.length, 2, "Preserve multi-material geometry slots");
assert.notEqual(copy.material[0], copy.material[1], "Role names are not material identity");
assert.equal((copy.material[0] as THREE.MeshPhysicalMaterial).color.getHex(), first.color.getHex());
assert.equal((copy.material[1] as THREE.MeshPhysicalMaterial).roughness, second.roughness);
assert.ok(copy.material.every(m => m instanceof THREE.MeshPhysicalMaterial),
  "Customization requires physical materials, including standard-material imports");
assert.deepEqual(copy.geometry.groups, geometry.groups);
assert.notEqual(copy.geometry, geometry, "Preparing an instance must not mutate cached source geometry");
assert.equal(geometry.getAttribute("position").getX(0), 0.5);
copy.geometry.dispose();
prepared.materials.forEach(m => m.dispose());
geometry.dispose(); first.dispose(); second.dispose();
console.log("PASS: imported transforms, material slots, distinct finishes and source isolation");
