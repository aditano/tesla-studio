const PALETTES: Record<string, [number, number, number][]> = {
  mars: [
    [112, 54, 42],
    [168, 86, 58],
    [196, 122, 86],
    [74, 36, 30],
  ],
  desert: [
    [230, 198, 140],
    [196, 154, 96],
    [240, 220, 176],
    [150, 112, 70],
  ],
  forest: [
    [48, 62, 40],
    [72, 84, 52],
    [36, 32, 24],
    [92, 78, 48],
  ],
  "night-city": [
    [28, 32, 42],
    [48, 56, 72],
    [18, 20, 28],
    [72, 58, 46],
  ],
  daylight: [
    [78, 82, 86],
    [118, 114, 104],
    [58, 62, 66],
    [168, 142, 104],
  ],
  studio: [
    [48, 54, 62],
    [64, 70, 78],
    [36, 42, 48],
    [82, 88, 96],
  ],
};

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 57);
  const b = hash(ix + 1 + iy * 57);
  const c = hash(ix + (iy + 1) * 57);
  const d = hash(ix + 1 + (iy + 1) * 57);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Biome-coloured ground. A flat fill has no chroma; this mix does. */
export function fillGroundImage(
  id: string,
  data: Uint8ClampedArray,
  size: number,
) {
  const palette = PALETTES[id] ?? PALETTES.studio;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = noise(x * 0.17, y * 0.17);
      const m = noise(x * 0.05 + 9, y * 0.05);
      const i = Math.min(palette.length - 1, Math.floor(n * palette.length));
      const j = Math.min(palette.length - 1, Math.floor(m * palette.length));
      const t = n * 0.65 + 0.2;
      const a = palette[i];
      const b = palette[j];
      const o = (y * size + x) * 4;
      data[o] = a[0] + (b[0] - a[0]) * t;
      data[o + 1] = a[1] + (b[1] - a[1]) * t;
      data[o + 2] = a[2] + (b[2] - a[2]) * t;
      data[o + 3] = 255;
    }
  }
}

export function groundChroma(id: string, size = 32) {
  const data = new Uint8ClampedArray(size * size * 4);
  fillGroundImage(id, data, size);
  let peak = 0;
  for (let i = 0; i < data.length; i += 4) {
    const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (chroma > peak) peak = chroma;
  }
  return peak;
}
