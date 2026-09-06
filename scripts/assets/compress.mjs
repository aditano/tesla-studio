import { MeshoptEncoder } from 'meshoptimizer';

/** Lossless EXT_meshopt_compression. All buffers stay inside the GLB. */
export async function compressGLB(input) {
  await MeshoptEncoder.ready;
  const source = Buffer.from(input),
    jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
  const binOffset = 20 + jsonLength + 8,
    bin = source.subarray(binOffset);
  let length = 0;
  const chunks = [];
  for (let i = 0; i < json.bufferViews.length; i++) {
    const view = json.bufferViews[i],
      accessor = json.accessors.find(a => a.bufferView === i);
    if (!accessor) throw Error('Unexpected nongeometry buffer view');
    const components = {
      SCALAR: 1,
      VEC2: 2,
      VEC3: 3,
      VEC4: 4
    }[accessor.type];
    const bytes = {
      5121: 1,
      5123: 2,
      5125: 4,
      5126: 4
    }[accessor.componentType];
    const stride = view.byteStride ?? components * bytes;
    const raw = new Uint8Array(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    const mode = view.target === 34963 ? 'TRIANGLES' : 'ATTRIBUTES';
    const encoded = Buffer.from(MeshoptEncoder.encodeGltfBuffer(raw, accessor.count, stride, mode, 0));
    view.buffer = 1;
    view.extensions = {
      EXT_meshopt_compression: {
        buffer: 0,
        byteOffset: length,
        byteLength: encoded.byteLength,
        byteStride: stride,
        count: accessor.count,
        mode,
        filter: 'NONE'
      }
    };
    chunks.push(encoded);
    length += encoded.byteLength;
    const padding = (4 - length % 4) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      length += padding;
    }
  }
  const fallback = json.buffers[0].byteLength;
  json.buffers = [{
    byteLength: length
  }, {
    byteLength: fallback,
    extensions: {
      EXT_meshopt_compression: {
        fallback: true
      }
    }
  }];
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_meshopt_compression'])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), 'EXT_meshopt_compression'])];
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
  const binary = Buffer.concat(chunks),
    header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + text.length + binary.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, text, binHeader, binary]);
}
