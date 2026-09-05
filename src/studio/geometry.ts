import * as THREE from "three";

export type Pt = [number, number];

export type TaperFn = (z: number, y: number) => number;

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x =
      u * u * u * p0[0] +
      3 * u * u * t * p1[0] +
      3 * u * t * t * p2[0] +
      t * t * t * p3[0];
    const y =
      u * u * u * p0[1] +
      3 * u * u * t * p1[1] +
      3 * u * t * t * p2[1] +
      t * t * t * p3[1];
    out.push([x, y]);
  }
  return out;
}

export function polyline(parts: Array<Pt | { b: [Pt, Pt, Pt, Pt]; n?: number }>): Pt[] {
  const pts: Pt[] = [];
  for (const part of parts) {
    if (Array.isArray(part)) {
      if (pts.length === 0 || pts[pts.length - 1][0] !== part[0] || pts[pts.length - 1][1] !== part[1]) {
        pts.push(part);
      }
    } else {
      const segs = cubic(part.b[0], part.b[1], part.b[2], part.b[3], part.n ?? 10);
      for (const p of segs) {
        if (pts.length === 0 || pts[pts.length - 1][0] !== p[0] || pts[pts.length - 1][1] !== p[1]) {
          pts.push(p);
        }
      }
    }
  }
  return pts;
}

function wheelArch(axle: number, radius: number, rocker: number, segs = 14): Pt[] {
  const pts: Pt[] = [];
  const r = radius + 0.05;
  const y0 = rocker;
  const lift = r + 0.08;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = Math.PI - t * Math.PI;
    const z = axle + Math.cos(a) * r;
    const y = y0 + Math.sin(t * Math.PI) * (lift - y0);
    pts.push([z, y]);
  }
  return pts;
}

export function model3Profile(): Pt[] {
  const rocker = 0.155;
  const front = polyline([
    { b: [[-2.36, rocker], [-2.42, 0.22], [-2.42, 0.4], [-2.34, 0.58]], n: 8 },
    { b: [[-2.34, 0.58], [-2.22, 0.72], [-1.7, 0.8], [-1.05, 0.88]], n: 12 },
    { b: [[-1.05, 0.88], [-0.78, 1.08], [-0.42, 1.32], [-0.12, 1.42]], n: 10 },
    { b: [[-0.12, 1.42], [0.35, 1.455], [0.95, 1.44], [1.18, 1.36]], n: 10 },
    { b: [[1.18, 1.36], [1.55, 1.18], [1.9, 0.98], [2.12, 0.9]], n: 10 },
    { b: [[2.12, 0.9], [2.3, 0.86], [2.38, 0.7], [2.38, 0.48]], n: 8 },
    { b: [[2.38, 0.48], [2.4, 0.32], [2.36, 0.2], [2.28, rocker]], n: 6 },
  ]);
  const rearArch = wheelArch(1.383, 0.34, rocker);
  const frontArch = wheelArch(-1.492, 0.34, rocker);
  const bottom: Pt[] = [
    [2.28, rocker],
    [1.383 + 0.39, rocker],
    ...rearArch.slice().reverse(),
    [0.2, rocker],
    [-1.492 + 0.39, rocker],
    ...frontArch.slice().reverse(),
    [-2.36, rocker],
  ];
  return [...front, ...bottom.slice(1)];
}

export function modelYProfile(): Pt[] {
  const rocker = 0.175;
  const front = polyline([
    { b: [[-2.4, rocker], [-2.48, 0.26], [-2.48, 0.48], [-2.38, 0.7]], n: 8 },
    { b: [[-2.38, 0.7], [-2.22, 0.88], [-1.7, 0.98], [-1.02, 1.08]], n: 12 },
    { b: [[-1.02, 1.08], [-0.72, 1.28], [-0.4, 1.5], [-0.1, 1.6]], n: 10 },
    { b: [[-0.1, 1.6], [0.45, 1.64], [1.05, 1.62], [1.28, 1.56]], n: 10 },
    { b: [[1.28, 1.56], [1.7, 1.4], [2.05, 1.18], [2.22, 1.08]], n: 10 },
    { b: [[2.22, 1.08], [2.38, 1.0], [2.44, 0.78], [2.42, 0.52]], n: 8 },
    { b: [[2.42, 0.52], [2.42, 0.34], [2.36, 0.22], [2.28, rocker]], n: 6 },
  ]);
  const rearArch = wheelArch(1.39, 0.355, rocker);
  const frontArch = wheelArch(-1.5, 0.355, rocker);
  const bottom: Pt[] = [
    [2.28, rocker],
    [1.39 + 0.41, rocker],
    ...rearArch.slice().reverse(),
    [0.15, rocker],
    [-1.5 + 0.41, rocker],
    ...frontArch.slice().reverse(),
    [-2.4, rocker],
  ];
  return [...front, ...bottom.slice(1)];
}

export function greenhouse3(): Pt[] {
  return polyline([
    { b: [[-0.82, 0.94], [-0.5, 1.18], [-0.18, 1.36], [0.05, 1.4]], n: 8 },
    { b: [[0.05, 1.4], [0.4, 1.43], [0.9, 1.41], [1.08, 1.34]], n: 8 },
    { b: [[1.08, 1.34], [1.35, 1.22], [1.55, 1.08], [1.62, 0.98]], n: 6 },
    [1.55, 0.92],
    [-0.72, 0.92],
  ]);
}

export function greenhouseY(): Pt[] {
  return polyline([
    { b: [[-0.88, 1.12], [-0.55, 1.36], [-0.2, 1.54], [0.05, 1.58]], n: 8 },
    { b: [[0.05, 1.58], [0.5, 1.61], [1.05, 1.58], [1.22, 1.5]], n: 8 },
    { b: [[1.22, 1.5], [1.55, 1.36], [1.78, 1.2], [1.85, 1.12]], n: 6 },
    [1.72, 1.08],
    [-0.78, 1.08],
  ]);
}

export function extrudeProfile(
  profile: Pt[],
  width: number,
  taper: TaperFn,
  opts?: {
    bevel?: number;
    bevelSegs?: number;
    steps?: number;
    wells?: { z: number; y: number; radius: number; inner: number }[];
  },
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  profile.forEach((p, i) => {
    if (i === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });
  shape.closePath();

  const bevel = opts?.bevel ?? 0.045;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: opts?.bevelSegs ?? 5,
    curveSegments: 12,
    steps: opts?.steps ?? 1,
  });

  const pos = geo.attributes.position;
  const mid = width / 2;
  for (let i = 0; i < pos.count; i++) {
    const zLen = pos.getX(i);
    const y = pos.getY(i);
    const xW = pos.getZ(i) - mid;
    const s = taper(zLen, y);
    pos.setXYZ(i, xW * s, y, zLen);
  }
  if (opts?.wells) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      for (const well of opts.wells) {
        const d = Math.hypot(z - well.z, y - well.y);
        if (d < well.radius && Math.abs(x) > well.inner) {
          const t = 1 - d / well.radius;
          const punched = Math.sign(x) * THREE.MathUtils.lerp(Math.abs(x), well.inner, t * t);
          pos.setX(i, punched);
        }
      }
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function passengerTaper(kind: "model-3" | "model-y"): TaperFn {
  return (z, y) => {
    let s = 1;
    const belt = kind === "model-y" ? 1.08 : 0.9;
    const roof = kind === "model-y" ? 1.62 : 1.44;
    if (y > belt) {
      const t = THREE.MathUtils.clamp((y - belt) / (roof - belt), 0, 1);
      s *= 1 - t * (kind === "model-y" ? 0.18 : 0.2);
    }
    if (z < -1.85) {
      const t = THREE.MathUtils.clamp((-1.85 - z) / 0.55, 0, 1);
      s *= 1 - t * 0.38;
    }
    if (z > 1.95) {
      const t = THREE.MathUtils.clamp((z - 1.95) / 0.5, 0, 1);
      s *= 1 - t * 0.32;
    }
    if (y < 0.35) s *= 0.96;
    return Math.max(s, 0.42);
  };
}

export function glassTaper(kind: "model-3" | "model-y"): TaperFn {
  const inner = kind === "model-y" ? 0.82 : 0.8;
  return (z, y) => passengerTaper(kind)(z, y) * inner;
}

export function roundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  segs = 3,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  // Simple bevel via scale of corners is overkill; keep box for panels.
  void r;
  void segs;
  return geo;
}

export function makePlane(w: number, h: number): THREE.BufferGeometry {
  return new THREE.PlaneGeometry(w, h);
}
