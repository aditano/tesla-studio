/** Import the credited source GLB; preserve geometry, UVs, textures and attribution.
 * Usage: node scripts/assets/import-highland.mjs /path/to/2024_tesla_model_3.glb */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compressGLB } from './compress.mjs';
const input = await fs.readFile(process.argv[2]);
const jsonLength = input.readUInt32LE(12);
const json = JSON.parse(input.subarray(20, 20 + jsonLength).toString());
const binary = input.subarray(28 + jsonLength);
const folder = 'public/models/highland';
await fs.mkdir(folder, {
  recursive: true
});
for (let i = 0; i < (json.images ?? []).length; i++) {
  const image = json.images[i],
    view = json.bufferViews[image.bufferView];
  const name = `texture-${i}.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`;
  await fs.writeFile(`${folder}/${name}`, binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  delete image.bufferView;
  image.uri = name;
}
const views = [],
  chunks = [];
let length = 0;
const indices = new Set(json.meshes.flatMap(m => m.primitives.map(p => p.indices)));
for (let i = 0; i < json.accessors.length; i++) {
  const accessor = json.accessors[i],
    old = json.bufferViews[accessor.bufferView];
  const components = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4
  }[accessor.type];
  const componentBytes = {
    5121: 1,
    5123: 2,
    5125: 4,
    5126: 4
  }[accessor.componentType];
  if (!components || !componentBytes || accessor.sparse) throw Error('Unsupported accessor');
  const stride = components * componentBytes,
    sourceStride = old.byteStride ?? stride;
  const start = (old.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
    chunk = Buffer.alloc(accessor.count * stride);
  for (let j = 0; j < accessor.count; j++) binary.copy(chunk, j * stride, start + j * sourceStride, start + j * sourceStride + stride);
  accessor.bufferView = views.length;
  accessor.byteOffset = 0;
  views.push({
    buffer: 0,
    byteOffset: length,
    byteLength: chunk.length,
    target: indices.has(i) ? 34963 : 34962
  });
  chunks.push(chunk);
  length += chunk.length;
  const padding = (4 - length % 4) % 4;
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    length += padding;
  }
}
json.bufferViews = views;
json.buffers = [{
  byteLength: length
}];
let text = Buffer.from(JSON.stringify(json));
text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
const header = Buffer.alloc(20),
  binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + text.length + length, 8);
header.writeUInt32LE(text.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const glb = await compressGLB(Buffer.concat([header, text, binHeader, ...chunks]));
await fs.writeFile(`${folder}/model.glb`, glb);
await fs.writeFile(`${folder}/manifest.json`, JSON.stringify({
  sourceSha256: createHash('sha256').update(input).digest('hex'),
  bytes: glb.length,
  sourceBytes: input.length,
  credit: json.asset.extras
}, null, 2) + '\n');
console.log(`Highland: ${input.length} source bytes → ${glb.length} compressed geometry bytes + original textures`);
