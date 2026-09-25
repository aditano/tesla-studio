/** Normalize a downloaded GLB to studio metres (+Y up, −Z forward) and meshopt-compress it.
 *
 * Usage:
 *   node scripts/assets/import-presentation.mjs <in.glb> <out.glb> --length 5.6829
 *
 * Sketchfab exports are Y-up. The longer of X/Z becomes length along Z.
 * Pass --up x or --up z only when the file is not Y-up.
 * Optional --yaw <degrees> spins the result after that alignment.
 * This does not download Sketchfab files. Use fetch-sketchfab.mjs with SKETCHFAB_TOKEN first.
 */
import fs from "node:fs/promises";
import { Blob as NodeBlob } from "node:buffer";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { MeshoptDecoder } from "three-stdlib";
import { compressGLB } from "./compress.mjs";

// GLTFExporter reads binary chunks with FileReader, which Node does not provide.
if (typeof globalThis.Blob !== "function") globalThis.Blob = NodeBlob;
if (typeof globalThis.FileReader !== "function") {
  globalThis.FileReader = class NodeFileReader {
    constructor() {
      this.result = null;
      this.onloadend = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buffer) => {
        this.result = buffer;
        this.onloadend?.();
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buffer) => {
        const bytes = Buffer.from(buffer);
        this.result = `data:application/octet-stream;base64,${bytes.toString("base64")}`;
        this.onloadend?.();
      });
    }
  };
}

const args = process.argv.slice(2);
const flags = new Map();
const positionals = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    flags.set(args[i].slice(2), args[i + 1]);
    i++;
  } else positionals.push(args[i]);
}
const [input, output] = positionals;
const targetLength = Number(flags.get("length"));
const yaw = Number(flags.get("yaw") ?? 0);
const upName = flags.get("up") ?? "y";
if (!input || !output || !Number.isFinite(targetLength) || targetLength <= 0) {
  console.error(
    "Usage: node scripts/assets/import-presentation.mjs <in.glb> <out.glb> --length <metres> [--yaw degrees]",
  );
  process.exit(1);
}

const bytes = await fs.readFile(input);
const loader = new GLTFLoader();
const decoder = typeof MeshoptDecoder === "function" ? MeshoptDecoder() : MeshoptDecoder;
await decoder.ready;
loader.setMeshoptDecoder(decoder);
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);

const root = new THREE.Group();
root.add(gltf.scene);
root.updateMatrixWorld(true);
const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
const axisVector = (name) =>
  new THREE.Vector3(name === "x" ? 1 : 0, name === "y" ? 1 : 0, name === "z" ? 1 : 0);
if (!["x", "y", "z"].includes(upName)) {
  console.error("--up must be x, y, or z");
  process.exit(1);
}
const horizontal = ["x", "y", "z"].filter((name) => name !== upName);
const lengthName = size[horizontal[0]] >= size[horizontal[1]] ? horizontal[0] : horizontal[1];
const align = new THREE.Quaternion().setFromUnitVectors(axisVector(upName), new THREE.Vector3(0, 1, 0));
const flat = axisVector(lengthName).applyQuaternion(align);
flat.y = 0;
if (flat.lengthSq() < 1e-8) {
  console.error("Length axis collapsed after the up alignment. Pass a different --up.");
  process.exit(1);
}
flat.normalize();
align.premultiply(new THREE.Quaternion().setFromUnitVectors(flat, new THREE.Vector3(0, 0, 1)));
root.quaternion.copy(align);
if (yaw) root.rotateY(THREE.MathUtils.degToRad(yaw));
root.updateMatrixWorld(true);
const aligned = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
const scale = targetLength / aligned.z;
root.scale.multiplyScalar(scale);
root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(root);
const center = box.getCenter(new THREE.Vector3());
root.position.x -= center.x;
root.position.z -= center.z;
root.position.y -= box.min.y;
root.updateMatrixWorld(true);

const exporter = new GLTFExporter();
const binary = await exporter.parseAsync(root, { binary: true });
const glb = await compressGLB(Buffer.from(binary));
await fs.mkdir(output.includes("/") ? output.slice(0, output.lastIndexOf("/")) : ".", {
  recursive: true,
});
await fs.writeFile(output, glb);
const finalSize = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
console.log(
  `wrote ${output} (${glb.length} bytes) ${finalSize.x.toFixed(3)} x ${finalSize.y.toFixed(3)} x ${finalSize.z.toFixed(3)} m`,
);
