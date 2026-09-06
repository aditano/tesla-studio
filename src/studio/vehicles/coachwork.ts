import * as THREE from "three";
export type Piece =
  "shell" | "fl" | "fr" | "rl" | "rr" | "hood" | "hatch" | "roof";
const stations = [
  [-2.4, 0.68, 0.56],
  [-2.28, 0.84, 0.72],
  [-1.8, 0.94, 0.84],
  [-0.94, 0.94, 0.94],
  [0, 0.945, 0.97],
  [1, 0.95, 0.96],
  [1.8, 0.91, 0.91],
  [2.25, 0.83, 0.86],
  [2.4, 0.69, 0.58],
];
function sample(z: number, column: number) {
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
  const a = stations[i],
    b = stations[i + 1];
  const t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  const e = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(a[column], b[column], e);
}
export function coachwork(crossover: boolean) {
  const lift = crossover ? 0.14 : 0,
    wide = crossover ? 1.035 : 1;
  const pieces = Object.fromEntries(
    ["shell", "fl", "fr", "rl", "rr", "hood", "hatch", "roof"].map((k) => [
      k,
      [],
    ]),
  ) as unknown as Record<Piece, THREE.BufferGeometry[]>;
  function surface(
    n: number,
    m: number,
    point: (u: number, v: number) => THREE.Vector3,
    classify: (p: THREE.Vector3) => Piece | null,
  ) {
    const vertices: number[] = [],
      uv: number[] = [],
      all: number[] = [],
      buckets = Object.fromEntries(
        Object.keys(pieces).map((k) => [k, []]),
      ) as unknown as Record<Piece, number[]>;
    for (let j = 0; j <= m; j++)
      for (let i = 0; i <= n; i++) {
        vertices.push(...point(i / n, j / m).toArray());
        uv.push(i / n, j / m);
      }
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i,
          b = a + 1,
          c = a + n + 1,
          d = c + 1;
        all.push(a, c, b, b, c, d);
        const p = point((i + 0.5) / n, (j + 0.5) / m);
        const key = classify(p);
        if (key) buckets[key].push(a, c, b, b, c, d);
      }
    const base = new THREE.BufferGeometry();
    base.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    base.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    base.setIndex(all);
    base.computeVertexNormals();
    for (const key of Object.keys(buckets) as Piece[]) {
      if (!buckets[key].length) continue;
      const g = base.clone();
      g.setIndex(buckets[key]);
      g.computeBoundingSphere();
      pieces[key].push(g);
    }
    base.dispose();
  }
  // Sculpted lower shell: continuous shoulder, curved fenders and physically empty wheel arches.
  surface(
    96,
    192,
    (u, v) => {
      const z = -2.4 + v * 4.8,
        a = u * Math.PI * 2,
        w = sample(z, 1) * wide,
        top = sample(z, 2) + lift;
      const x = Math.sin(a) * w;
      const y = 0.26 + ((top - 0.26) * (Math.cos(a) + 1)) / 2;
      return new THREE.Vector3(x, y, z);
    },
    (p) => {
      // The cabin is an opening, not a painted shelf through the seats.
      if (Math.abs(p.x) < 0.7 && p.z > -0.94 && p.z < 1.5 && p.y > 0.83 + lift)
        return null;
      if (
        Math.abs(p.x) > 0.62 &&
        [-1.49, 1.39].some((z) => Math.hypot(p.z - z, p.y - 0.35) < 0.405)
      )
        return null;
      if (Math.abs(p.x) > 0.7 * wide && p.y > 0.34 && p.z > -0.9 && p.z < 1.12)
        return p.z < 0.25 ? (p.x < 0 ? "fl" : "fr") : p.x < 0 ? "rl" : "rr";
      if (
        Math.abs(p.x) < 0.69 &&
        p.y > 0.71 + lift &&
        p.z < -0.94 &&
        p.z > -2.16
      )
        return "hood";
      if (Math.abs(p.x) < 0.73 && p.y > 0.78 + lift && p.z > 1.5)
        return "hatch";
      return "shell";
    },
  );
  // Glass canopy has its own surface rather than hiding inside a solid painted extrusion.
  surface(
    64,
    100,
    (u, v) => {
      const z = -1 + v * 2.75,
        arch = Math.sin(v * Math.PI),
        across = (u - 0.5) * 2;
      const belt = 0.93 + lift,
        roof = (crossover ? 0.56 : 0.49) * Math.pow(Math.max(0, arch), 0.78);
      const x = across * (0.85 - 0.14 * arch) * wide;
      const y = belt + roof * (1 - 0.16 * Math.pow(Math.abs(across), 3));
      return new THREE.Vector3(x, y, z);
    },
    (p) => (crossover && p.z > 1.15 ? "hatch" : "roof"),
  );
  // Four separate frameless side windows follow the canopy's longitudinal profile.
  for (const side of [-1, 1])
    surface(
      90,
      12,
      (u, v) => {
        const z = -0.98 + u * 2.7,
          t = (z + 1) / 2.75,
          arch = Math.max(0, Math.sin(t * Math.PI));
        const roof = (crossover ? 0.56 : 0.49) * Math.pow(arch, 0.78) * 0.84;
        return new THREE.Vector3(
          side * THREE.MathUtils.lerp(0.88, 0.85 - 0.14 * arch, v) * wide,
          0.935 + lift + roof * v,
          z,
        );
      },
      (p) =>
        p.z < -0.9 || p.z > 1.12
          ? "roof"
          : p.z < 0.25
            ? side < 0
              ? "fl"
              : "fr"
            : side < 0
              ? "rl"
              : "rr",
    );
  return pieces;
}
