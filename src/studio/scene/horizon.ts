import * as THREE from "three";

export type RidgeLayer = {
  /** Distance from the car, metres. */
  radius: number;
  /** Silhouette height range above the ground, metres. */
  height: [number, number];
  /** Silhouette colour before atmospheric fade. */
  color: string;
  /** 0 keeps the colour; 1 dissolves the layer fully into the haze. */
  haze: number;
  /** Profile character: rolling hills, jagged peaks, flat mesas or blocky
   * skyline towers. */
  profile: "rolling" | "jagged" | "mesa" | "skyline";
  seed: number;
};

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise1(x: number, seed: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 17.3) * (1 - u) + hash(i + 1 + seed * 17.3) * u;
}

function profileAt(layer: RidgeLayer, t: number) {
  const x = t * 64;
  const { seed } = layer;
  switch (layer.profile) {
    case "rolling":
      return (
        noise1(x * 0.18, seed) * 0.6 +
        noise1(x * 0.5, seed + 1) * 0.3 +
        noise1(x * 1.3, seed + 2) * 0.1
      );
    case "jagged": {
      const ridge = 1 - Math.abs(noise1(x * 0.35, seed) * 2 - 1);
      return ridge * 0.65 + noise1(x * 1.6, seed + 3) * 0.25 + noise1(x * 4, seed + 4) * 0.1;
    }
    case "mesa": {
      const base = noise1(x * 0.22, seed);
      // Quantize into flat tops with steep flanks.
      const step = Math.round(base * 3) / 3;
      return step * 0.8 + base * 0.2;
    }
    case "skyline": {
      // One tower per cell, with some gaps and a few tall landmarks.
      const cell = Math.floor(x * 1.4);
      const h = hash(cell + seed * 9.1);
      return h < 0.18 ? h * 0.8 : h * h * (hash(cell * 3.1 + seed) > 0.92 ? 1.6 : 1);
    }
  }
}

/** A ring of silhouette geometry that closes the horizon. Vertex colours fade
 * from the layer colour at the crest to the haze colour at the base, and the
 * whole layer is pre-blended toward the haze so nearer layers read darker and
 * crisper than distant ones. Unlit and fog-free, so it costs one draw call. */
export function makeRidgeRing(
  layer: RidgeLayer,
  hazeColor: string,
  segments = 360,
): THREE.Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const haze = new THREE.Color(hazeColor);
  const crest = new THREE.Color(layer.color).lerp(haze, layer.haze);
  const foot = crest.clone().lerp(haze, 0.55);
  const [low, high] = layer.height;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const angle = t * Math.PI * 2;
    const x = Math.cos(angle) * layer.radius;
    const z = Math.sin(angle) * layer.radius;
    const h = low + (high - low) * Math.min(1, Math.max(0, profileAt(layer, t)));
    positions.push(x, -0.5, z, x, h, z);
    colors.push(foot.r, foot.g, foot.b, crest.r, crest.g, crest.b);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ridge_${layer.profile}_${layer.radius}`;
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.raycast = () => undefined;
  return mesh;
}

/** Several ridge layers, ordered far to near so nearer ones draw on top. */
export function makeHorizon(layers: RidgeLayer[], hazeColor: string) {
  const group = new THREE.Group();
  group.name = "horizon";
  [...layers]
    .sort((a, b) => b.radius - a.radius)
    .forEach((layer) => group.add(makeRidgeRing(layer, hazeColor)));
  return group;
}

export function disposeHorizon(group: THREE.Object3D) {
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    (o.material as THREE.Material).dispose();
  });
}
