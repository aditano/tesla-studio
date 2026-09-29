export const BACKDROP_IDS = [
  "studio",
  "daylight",
  "midnight",
  "mars",
  "forest",
  "night-city",
  "desert",
] as const;

export type BackdropId = (typeof BACKDROP_IDS)[number];

export type SceneryKind = "none" | "mars" | "forest" | "city" | "desert" | "day";

export type Backdrop = {
  id: BackdropId;
  label: string;
  night: boolean;
  day: boolean;
  background: string;
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  floor: string;
  exposure: number;
  hemiIntensity: number;
  hemiSky: string;
  hemiGround: string;
  keyPosition: [number, number, number];
  keyIntensity: number;
  keyColor: string;
  fillPosition: [number, number, number];
  fillIntensity: number;
  fillColor: string;
  /** Scales reflections from the environment map. Bright backdrops mirror a
   * lot of white into the clearcoat, which bleaches saturated paint. */
  envIntensity: number;
  /** Rim light from behind the car, so its outline separates from the
   * background. Intensity 0 disables it. */
  rimPosition: [number, number, number];
  rimIntensity: number;
  rimColor: string;
  scenery: SceneryKind;
  /** Studio reflector. Outdoor scenes use a matte road instead. */
  mirror: boolean;
  bloomThreshold: number;
  bloomIntensity: number;
  vignetteOffset: number;
  vignetteDarkness: number;
  ao: number;
  /** Headlight candela and ground-pool opacity. */
  beam: number;
  pool: number;
};

export const BACKDROPS: readonly Backdrop[] = [
  {
    id: "studio",
    label: "Studio",
    night: false,
    day: false,
    background: "#10141a",
    skyTop: "#1a222c",
    skyBottom: "#10141a",
    fog: "#10141a",
    fogNear: 18,
    fogFar: 58,
    floor: "#2c333b",
    exposure: 0.8,
    hemiIntensity: 0.34,
    hemiSky: "#e6eef6",
    hemiGround: "#2a2e33",
    keyPosition: [6.4, 7.2, -4.6],
    keyIntensity: 6.4,
    keyColor: "#fff1e4",
    fillPosition: [-5.8, 3.1, 4.4],
    fillIntensity: 0.85,
    fillColor: "#b7c6da",
    envIntensity: 1,
    rimPosition: [0.6, 3.2, 9.2],
    rimIntensity: 1.8,
    rimColor: "#e7eef8",
    scenery: "none",
    mirror: true,
    bloomThreshold: 0.92,
    bloomIntensity: 0.1,
    vignetteOffset: 0.4,
    vignetteDarkness: 0.24,
    ao: 0.58,
    beam: 300,
    pool: 0.14,
  },
  {
    id: "daylight",
    label: "Daylight",
    night: false,
    day: true,
    background: "#9eb6cc",
    skyTop: "#6eabe2",
    skyBottom: "#d9c7aa",
    fog: "#c5d4e2",
    fogNear: 48,
    fogFar: 340,
    floor: "#8a8478",
    exposure: 0.92,
    hemiIntensity: 0.55,
    hemiSky: "#d5e6f4",
    hemiGround: "#8a7d6c",
    keyPosition: [8.2, 9.4, -3.2],
    keyIntensity: 4.6,
    keyColor: "#fff0d2",
    fillPosition: [-6.4, 3.6, 5.2],
    fillIntensity: 0.7,
    fillColor: "#c5d6ea",
    envIntensity: 0.82,
    rimPosition: [-0.4, 3.4, 10],
    rimIntensity: 1.15,
    rimColor: "#fff6e8",
    scenery: "day",
    mirror: false,
    bloomThreshold: 0.94,
    bloomIntensity: 0.06,
    vignetteOffset: 0.48,
    vignetteDarkness: 0.14,
    ao: 0.48,
    beam: 140,
    pool: 0.05,
  },
  {
    id: "midnight",
    label: "Midnight",
    night: true,
    day: false,
    background: "#05070a",
    skyTop: "#121826",
    skyBottom: "#05070a",
    fog: "#05070a",
    fogNear: 16,
    fogFar: 52,
    floor: "#222830",
    exposure: 0.9,
    hemiIntensity: 0.18,
    hemiSky: "#9aadc4",
    hemiGround: "#0a0c10",
    keyPosition: [5.6, 6.2, -4.8],
    keyIntensity: 1.45,
    keyColor: "#d5e2f4",
    fillPosition: [-5.2, 2.4, 3.8],
    fillIntensity: 0.22,
    fillColor: "#6e84a8",
    envIntensity: 1,
    rimPosition: [0.2, 2.8, 9.4],
    rimIntensity: 1.85,
    rimColor: "#9eb6e0",
    scenery: "none",
    mirror: true,
    bloomThreshold: 0.88,
    bloomIntensity: 0.16,
    vignetteOffset: 0.34,
    vignetteDarkness: 0.34,
    ao: 0.78,
    beam: 320,
    pool: 0.42,
  },
  {
    id: "mars",
    label: "Mars",
    night: false,
    day: true,
    background: "#946250",
    skyTop: "#c49078",
    skyBottom: "#684034",
    fog: "#8b5c4e",
    fogNear: 28,
    fogFar: 300,
    floor: "#745044",
    exposure: 0.94,
    hemiIntensity: 0.44,
    hemiSky: "#d7aa96",
    hemiGround: "#5c342c",
    keyPosition: [7.4, 4.8, -6.2],
    keyIntensity: 1.8,
    keyColor: "#e08a62",
    fillPosition: [-6.2, 2.4, -4.8],
    fillIntensity: 0.4,
    fillColor: "#c4846c",
    envIntensity: 0.9,
    rimPosition: [0, 2.6, 12],
    rimIntensity: 0.9,
    rimColor: "#ffb48a",
    scenery: "mars",
    mirror: false,
    bloomThreshold: 0.92,
    bloomIntensity: 0.08,
    vignetteOffset: 0.32,
    vignetteDarkness: 0.28,
    ao: 0.42,
    beam: 200,
    pool: 0.08,
  },
  {
    id: "forest",
    label: "Forest",
    night: false,
    day: false,
    background: "#2a4034",
    skyTop: "#a9c4ae",
    skyBottom: "#24382e",
    fog: "#20352c",
    fogNear: 24,
    fogFar: 280,
    floor: "#322e26",
    exposure: 0.96,
    hemiIntensity: 0.48,
    hemiSky: "#d6e6cc",
    hemiGround: "#241c14",
    keyPosition: [3.6, 7.4, -5.1],
    keyIntensity: 1.75,
    keyColor: "#f4f0e4",
    fillPosition: [-5.2, 2.2, -3.8],
    fillIntensity: 0.48,
    fillColor: "#8fb496",
    envIntensity: 0.95,
    rimPosition: [0, 3, 12],
    rimIntensity: 0.7,
    rimColor: "#e4f0c8",
    scenery: "forest",
    mirror: false,
    bloomThreshold: 0.88,
    bloomIntensity: 0.15,
    vignetteOffset: 0.4,
    vignetteDarkness: 0.24,
    ao: 0.52,
    beam: 200,
    pool: 0.09,
  },
  {
    id: "night-city",
    label: "Night city",
    night: true,
    day: false,
    background: "#070814",
    skyTop: "#1a2040",
    skyBottom: "#070814",
    fog: "#090b16",
    fogNear: 32,
    fogFar: 240,
    floor: "#1c1f28",
    exposure: 1.0,
    hemiIntensity: 0.24,
    hemiSky: "#8498c0",
    hemiGround: "#080a10",
    keyPosition: [-7.2, 3.8, -3.6],
    keyIntensity: 1.4,
    keyColor: "#ffb56e",
    fillPosition: [6.8, 2.6, 3.4],
    fillIntensity: 0.42,
    fillColor: "#6e98ff",
    envIntensity: 1.1,
    rimPosition: [1.5, 2.6, 12],
    rimIntensity: 1.4,
    rimColor: "#8fb2ff",
    scenery: "city",
    mirror: false,
    bloomThreshold: 0.82,
    bloomIntensity: 0.2,
    vignetteOffset: 0.3,
    vignetteDarkness: 0.36,
    ao: 0.66,
    beam: 340,
    pool: 0.24,
  },
  {
    id: "desert",
    label: "Desert",
    night: false,
    day: true,
    background: "#e6cba4",
    skyTop: "#f4e2bc",
    skyBottom: "#d6b48a",
    fog: "#ead4ae",
    fogNear: 36,
    fogFar: 320,
    floor: "#c6a56c",
    exposure: 0.84,
    hemiIntensity: 0.48,
    hemiSky: "#e4c69c",
    hemiGround: "#a88454",
    keyPosition: [3.2, 10.4, -2.2],
    keyIntensity: 1.75,
    keyColor: "#ffe2b4",
    fillPosition: [-5.6, 3.0, -4.4],
    fillIntensity: 0.52,
    fillColor: "#f0c898",
    envIntensity: 0.74,
    rimPosition: [0, 3, 12],
    rimIntensity: 0.55,
    rimColor: "#ffe0b0",
    scenery: "desert",
    mirror: false,
    bloomThreshold: 0.94,
    bloomIntensity: 0.05,
    vignetteOffset: 0.42,
    vignetteDarkness: 0.16,
    ao: 0.4,
    beam: 140,
    pool: 0.05,
  },
];

const byId = new Map(BACKDROPS.map((backdrop) => [backdrop.id, backdrop]));

export function backdropById(id: string): Backdrop {
  return byId.get(id as BackdropId) ?? BACKDROPS[0];
}

export function isBackdropId(id: string): id is BackdropId {
  return byId.has(id as BackdropId);
}

/** Key, fill and rim the canvas actually installs for a backdrop. */
export function lightRig(backdrop: Backdrop) {
  return {
    key: {
      position: backdrop.keyPosition,
      intensity: backdrop.keyIntensity,
      color: backdrop.keyColor,
    },
    fill: {
      position: backdrop.fillPosition,
      intensity: backdrop.fillIntensity,
      color: backdrop.fillColor,
    },
    rim: {
      position: backdrop.rimPosition,
      intensity: backdrop.rimIntensity,
      color: backdrop.rimColor,
    },
  };
}
