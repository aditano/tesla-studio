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

export type SceneryKind = "none" | "mars" | "forest" | "city" | "desert";

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
    keyPosition: [5.2, 6.4, -5.4],
    keyIntensity: 5.5,
    keyColor: "#f5f7fb",
    fillPosition: [5.6, 5.2, 2.8],
    fillIntensity: 0.22,
    fillColor: "#fff6ec",
    scenery: "none",
    mirror: true,
    bloomThreshold: 0.62,
    bloomIntensity: 0.34,
    vignetteOffset: 0.4,
    vignetteDarkness: 0.24,
    ao: 0.58,
    beam: 6400,
    pool: 0.46,
  },
  {
    id: "daylight",
    label: "Daylight",
    night: false,
    day: true,
    background: "#7d858d",
    skyTop: "#c5d0da",
    skyBottom: "#7d858d",
    fog: "#7d858d",
    fogNear: 22,
    fogFar: 70,
    floor: "#6a7178",
    exposure: 0.96,
    hemiIntensity: 0.6,
    hemiSky: "#f3f6fa",
    hemiGround: "#6a7076",
    keyPosition: [5.2, 6.4, -5.4],
    keyIntensity: 1.8,
    keyColor: "#fff4e4",
    fillPosition: [5.6, 5.2, 2.8],
    fillIntensity: 0.3,
    fillColor: "#fff6ec",
    scenery: "none",
    mirror: true,
    bloomThreshold: 0.78,
    bloomIntensity: 0.2,
    vignetteOffset: 0.48,
    vignetteDarkness: 0.14,
    ao: 0.48,
    beam: 2800,
    pool: 0.2,
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
    floor: "#1b2026",
    exposure: 0.78,
    hemiIntensity: 0.18,
    hemiSky: "#9aadc4",
    hemiGround: "#0a0c10",
    keyPosition: [5.2, 6.4, -5.4],
    keyIntensity: 0.35,
    keyColor: "#c5d2e6",
    fillPosition: [5.6, 5.2, 2.8],
    fillIntensity: 0.1,
    fillColor: "#8aa0c4",
    scenery: "none",
    mirror: true,
    bloomThreshold: 0.42,
    bloomIntensity: 0.55,
    vignetteOffset: 0.34,
    vignetteDarkness: 0.34,
    ao: 0.78,
    beam: 12000,
    pool: 0.7,
  },
  {
    id: "mars",
    label: "Mars",
    night: false,
    day: true,
    background: "#b85a3c",
    skyTop: "#e7a07a",
    skyBottom: "#8a3a28",
    fog: "#a84d34",
    fogNear: 14,
    fogFar: 48,
    floor: "#7a3828",
    exposure: 0.92,
    hemiIntensity: 0.55,
    hemiSky: "#f0b090",
    hemiGround: "#6a2c22",
    keyPosition: [7.5, 3.4, -6],
    keyIntensity: 2.6,
    keyColor: "#ffb088",
    fillPosition: [-6, 2.2, 4],
    fillIntensity: 0.35,
    fillColor: "#c47a62",
    scenery: "mars",
    mirror: false,
    bloomThreshold: 0.7,
    bloomIntensity: 0.28,
    vignetteOffset: 0.32,
    vignetteDarkness: 0.28,
    ao: 0.42,
    beam: 7000,
    pool: 0.42,
  },
  {
    id: "forest",
    label: "Forest",
    night: false,
    day: false,
    background: "#1e3328",
    skyTop: "#8eaf98",
    skyBottom: "#24382c",
    fog: "#24382c",
    fogNear: 12,
    fogFar: 42,
    floor: "#2c382c",
    exposure: 0.86,
    hemiIntensity: 0.42,
    hemiSky: "#d5e6d4",
    hemiGround: "#1a281c",
    keyPosition: [4.2, 8.5, -2.4],
    keyIntensity: 1.55,
    keyColor: "#f3f6e4",
    fillPosition: [-5, 2.4, 3],
    fillIntensity: 0.28,
    fillColor: "#9eb89a",
    scenery: "forest",
    mirror: false,
    bloomThreshold: 0.64,
    bloomIntensity: 0.3,
    vignetteOffset: 0.36,
    vignetteDarkness: 0.3,
    ao: 0.62,
    beam: 6200,
    pool: 0.4,
  },
  {
    id: "night-city",
    label: "Night city",
    night: true,
    day: false,
    background: "#070814",
    skyTop: "#1a2040",
    skyBottom: "#070814",
    fog: "#070814",
    fogNear: 16,
    fogFar: 55,
    floor: "#12141c",
    exposure: 0.82,
    hemiIntensity: 0.16,
    hemiSky: "#8aa0d0",
    hemiGround: "#0a0c12",
    keyPosition: [-6.5, 4.2, -4],
    keyIntensity: 1.35,
    keyColor: "#ffc9a0",
    fillPosition: [6, 3.2, 2],
    fillIntensity: 0.28,
    fillColor: "#7aa0ff",
    scenery: "city",
    mirror: false,
    bloomThreshold: 0.38,
    bloomIntensity: 0.62,
    vignetteOffset: 0.28,
    vignetteDarkness: 0.4,
    ao: 0.7,
    beam: 14000,
    pool: 0.74,
  },
  {
    id: "desert",
    label: "Desert",
    night: false,
    day: true,
    background: "#e4c496",
    skyTop: "#f6e2bc",
    skyBottom: "#d7b48a",
    fog: "#e0c29a",
    fogNear: 16,
    fogFar: 62,
    floor: "#c2a36a",
    exposure: 0.98,
    hemiIntensity: 0.62,
    hemiSky: "#fff4dc",
    hemiGround: "#b08a58",
    keyPosition: [4, 9.2, -3],
    keyIntensity: 2.4,
    keyColor: "#fff1d0",
    fillPosition: [-5, 3, 4],
    fillIntensity: 0.32,
    fillColor: "#f0d0a8",
    scenery: "desert",
    mirror: false,
    bloomThreshold: 0.74,
    bloomIntensity: 0.22,
    vignetteOffset: 0.42,
    vignetteDarkness: 0.16,
    ao: 0.4,
    beam: 3600,
    pool: 0.24,
  },
];

const byId = new Map(BACKDROPS.map((backdrop) => [backdrop.id, backdrop]));

export function backdropById(id: string): Backdrop {
  return byId.get(id as BackdropId) ?? BACKDROPS[0];
}

export function isBackdropId(id: string): id is BackdropId {
  return byId.has(id as BackdropId);
}
