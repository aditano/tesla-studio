export type ModelId =
  | "model-3"
  | "model-y"
  | "cybertruck"
  | "cybercab"
  | "model-3-heritage"
  | "model-s-heritage";
export type PartId =
  | "door-fl"
  | "door-fr"
  | "door-rl"
  | "door-rr"
  | "frunk"
  | "trunk"
  | "charge"
  | "tonneau";

export type FeatureId =
  | "lightbar"
  | "headlights"
  | "doors"
  | "frunk"
  | "trunk"
  | "charge"
  | "suspension"
  | "tonneau"
  | "butterfly"
  | "interior"
  | "performance";

export type Finish = "gloss" | "pearl" | "metallic" | "satin" | "stainless";

export type Paint = {
  id: string;
  name: string;
  hex: string;
  finish: Finish;
  flake?: string;
};

export type Interior = {
  id: string;
  name: string;
  leather: string;
  stitch: string;
  dash: string;
};

export type Variant = {
  id: string;
  name: string;
  subtitle: string;
  wheelStyle: WheelStyle;
  wheelRadius: number;
  caliper: string;
  spoiler?: boolean;
  lowered?: number;
};

export type WheelStyle =
  "photon" | "nova" | "helix" | "sport" | "cyber" | "aero";

export type Feature = {
  id: FeatureId;
  label: string;
  hint: string;
};

export type VehicleDef = {
  id: ModelId;
  name: string;
  tag: string;
  variants: Variant[];
  exteriors: Paint[];
  interiors: Interior[];
  features: Feature[];
  parts: PartId[];
};

export const PAINT: Record<string, Paint> = {
  "stealth-grey": {
    id: "stealth-grey",
    name: "Stealth Grey",
    hex: "#3c4046",
    finish: "metallic",
  },
  "pearl-white": {
    id: "pearl-white",
    name: "Pearl White",
    hex: "#f3f1ea",
    finish: "pearl",
  },
  "diamond-black": {
    id: "diamond-black",
    name: "Diamond Black",
    hex: "#0b0c0e",
    finish: "gloss",
  },
  "marine-blue": {
    id: "marine-blue",
    name: "Marine Blue",
    hex: "#12344f",
    finish: "metallic",
    flake: "#9ec7e8",
  },
  "frost-blue": {
    id: "frost-blue",
    name: "Frost Blue",
    hex: "#9ebfd0",
    finish: "metallic",
  },
  quicksilver: {
    id: "quicksilver",
    name: "Quicksilver",
    hex: "#b7bec4",
    finish: "metallic",
  },
  "ultra-red": {
    id: "ultra-red",
    name: "Ultra Red",
    hex: "#8f1518",
    finish: "pearl",
    flake: "#ff6b4a",
  },
  "deep-blue": {
    id: "deep-blue",
    name: "Deep Blue Metallic",
    hex: "#14253c",
    finish: "metallic",
    flake: "#7ea4d6",
  },
  stainless: {
    id: "stainless",
    name: "Stainless Steel",
    hex: "#c5c8cc",
    finish: "stainless",
  },
  "satin-black": {
    id: "satin-black",
    name: "Satin Black",
    hex: "#161616",
    finish: "satin",
  },
  "satin-white": {
    id: "satin-white",
    name: "Satin White",
    hex: "#e7e4dc",
    finish: "satin",
  },
  "satin-blue": {
    id: "satin-blue",
    name: "Satin Blue",
    hex: "#3a5f7a",
    finish: "satin",
  },
  "abyss-green": {
    id: "abyss-green",
    name: "Satin Abyss Green",
    hex: "#2a4036",
    finish: "satin",
  },
  "cab-white": {
    id: "cab-white",
    name: "Arctic White",
    hex: "#f4f2ec",
    finish: "pearl",
  },
  "cab-gold": {
    id: "cab-gold",
    name: "RIM Gold",
    hex: "#c2a36b",
    finish: "metallic",
  },
};

export const INTERIORS: Record<string, Interior> = {
  black: {
    id: "black",
    name: "Black",
    leather: "#161616",
    stitch: "#2a2a2a",
    dash: "#101012",
  },
  white: {
    id: "white",
    name: "White",
    leather: "#e8e4dc",
    stitch: "#d0ccc4",
    dash: "#1a1a1c",
  },
  "zen-grey": {
    id: "zen-grey",
    name: "Zen Grey",
    leather: "#c5c6c8",
    stitch: "#9a9b9d",
    dash: "#2a2c2e",
  },
  cream: {
    id: "cream",
    name: "Cream",
    leather: "#d9cbb6",
    stitch: "#b7a790",
    dash: "#1c1c1e",
  },
};

const PASSENGER_PAINT = [
  PAINT["stealth-grey"],
  PAINT["pearl-white"],
  PAINT["diamond-black"],
  PAINT["marine-blue"],
  PAINT["frost-blue"],
  PAINT["quicksilver"],
  PAINT["ultra-red"],
  PAINT["deep-blue"],
];

export const VEHICLES: VehicleDef[] = [
  {
    id: "model-3",
    name: "Model 3",
    tag: "Highland",
    variants: [
      {
        id: "rwd",
        name: "Rear-Wheel Drive",
        subtitle: '18" Photon',
        wheelStyle: "photon",
        wheelRadius: 0.332,
        caliper: "#1a1a1a",
      },
      {
        id: "lr",
        name: "Long Range AWD",
        subtitle: '19" Nova',
        wheelStyle: "nova",
        wheelRadius: 0.345,
        caliper: "#1a1a1a",
      },
      {
        id: "p",
        name: "Performance",
        subtitle: '20" Sport',
        wheelStyle: "sport",
        wheelRadius: 0.352,
        caliper: "#c41212",
        spoiler: true,
        lowered: 0.02,
      },
    ],
    exteriors: PASSENGER_PAINT,
    interiors: [INTERIORS.black, INTERIORS.white, INTERIORS["zen-grey"]],
    features: [
      {
        id: "headlights",
        label: "Headlights",
        hint: "Projector DRLs and main beams",
      },
      { id: "doors", label: "Doors", hint: "Frameless four-door cabin" },
      { id: "frunk", label: "Frunk", hint: "Front trunk" },
      { id: "trunk", label: "Trunk", hint: "Power liftgate" },
      { id: "charge", label: "Charge port", hint: "NACS, driver quarter" },
    ],
    parts: [
      "door-fl",
      "door-fr",
      "door-rl",
      "door-rr",
      "frunk",
      "trunk",
      "charge",
    ],
  },
  {
    id: "model-y",
    name: "Model Y",
    tag: "Juniper",
    variants: [
      {
        id: "rwd",
        name: "Rear-Wheel Drive",
        subtitle: '19" Crossflow',
        wheelStyle: "photon",
        wheelRadius: 0.348,
        caliper: "#1a1a1a",
      },
      {
        id: "lr",
        name: "Long Range AWD",
        subtitle: '19" Crossflow',
        wheelStyle: "nova",
        wheelRadius: 0.348,
        caliper: "#1a1a1a",
      },
      {
        id: "p",
        name: "Performance",
        subtitle: '21" Helix',
        wheelStyle: "helix",
        wheelRadius: 0.365,
        caliper: "#c41212",
        spoiler: true,
        lowered: 0.015,
      },
    ],
    exteriors: PASSENGER_PAINT,
    interiors: [INTERIORS.black, INTERIORS["zen-grey"], INTERIORS.white],
    features: [
      { id: "lightbar", label: "Light bar", hint: "Juniper signature blade" },
      { id: "headlights", label: "Headlights", hint: "Corner projectors" },
      { id: "doors", label: "Doors", hint: "Four-door cabin" },
      { id: "frunk", label: "Frunk", hint: "Front trunk" },
      { id: "trunk", label: "Liftgate", hint: "Hands-free cargo" },
      { id: "charge", label: "Charge port", hint: "NACS, driver quarter" },
    ],
    parts: [
      "door-fl",
      "door-fr",
      "door-rl",
      "door-rr",
      "frunk",
      "trunk",
      "charge",
    ],
  },
  {
    id: "cybertruck",
    name: "Cybertruck",
    tag: "Exoskeleton",
    variants: [
      {
        id: "awd",
        name: "All-Wheel Drive",
        subtitle: '20" Cyber',
        wheelStyle: "cyber",
        wheelRadius: 0.445,
        caliper: "#2a2a2a",
      },
      {
        id: "beast",
        name: "Cyberbeast",
        subtitle: "Tri-motor",
        wheelStyle: "cyber",
        wheelRadius: 0.445,
        caliper: "#c41212",
      },
    ],
    exteriors: [
      PAINT.stainless,
      PAINT["satin-black"],
      PAINT["satin-white"],
      PAINT["satin-blue"],
      PAINT["abyss-green"],
    ],
    interiors: [INTERIORS.black, INTERIORS.white, INTERIORS.cream],
    features: [
      { id: "lightbar", label: "Light bar", hint: "Full-width LED blade" },
      {
        id: "suspension",
        label: "Air suspension",
        hint: "Raise and lower the body",
      },
      { id: "tonneau", label: "Tonneau", hint: "Power tonneau cover" },
      { id: "frunk", label: "Frunk", hint: "Front vault" },
      { id: "trunk", label: "Bed", hint: "Stainless vault" },
      { id: "headlights", label: "Headlights", hint: "Matrix projectors" },
    ],
    parts: [
      "door-fl",
      "door-fr",
      "door-rl",
      "door-rr",
      "frunk",
      "tonneau",
      "trunk",
    ],
  },
  {
    id: "cybercab",
    name: "Cybercab",
    tag: "Robotaxi",
    variants: [
      {
        id: "cab",
        name: "Cybercab",
        subtitle: "Autonomous two-seater",
        wheelStyle: "aero",
        wheelRadius: 0.33,
        caliper: "#1a1a1a",
      },
    ],
    exteriors: [
      PAINT["cab-white"],
      PAINT["stealth-grey"],
      PAINT["cab-gold"],
      PAINT["diamond-black"],
      PAINT.quicksilver,
    ],
    interiors: [INTERIORS.cream, INTERIORS.white, INTERIORS.black],
    features: [
      { id: "lightbar", label: "Light bar", hint: "Autonomous signature" },
      { id: "butterfly", label: "Butterfly doors", hint: "Canopy doors" },
      { id: "frunk", label: "Frunk", hint: "Front storage" },
      { id: "headlights", label: "Headlights", hint: "Corner lamps" },
    ],
    parts: ["door-fl", "door-fr", "frunk"],
  },
];

const heritageFeatures: Feature[] = [
  {
    id: "headlights",
    label: "LED lighting",
    hint: "A closer look at the front lighting signature.",
  },
  {
    id: "doors",
    label: "Frameless doors",
    hint: "Open the front doors and explore the cabin.",
  },
  {
    id: "frunk",
    label: "Front storage",
    hint: "Lift the hood to reveal the front storage compartment.",
  },
  { id: "trunk", label: "Rear cargo", hint: "Open the rear cargo area." },
  {
    id: "interior",
    label: "Inside the cabin",
    hint: "Move into the cabin and explore the minimalist interior.",
  },
];
VEHICLES.unshift(
  {
    ...VEHICLES[0],
    id: "model-3-heritage",
    name: "Model 3",
    tag: "Original design",
    features: heritageFeatures,
    variants: [
      {
        id: "rwd",
        name: "Standard Range Plus",
        subtitle: "Rear-wheel drive",
        wheelStyle: "photon",
        wheelRadius: 0.34,
        caliper: "#35383d",
      },
      {
        id: "lr",
        name: "Long Range AWD",
        subtitle: "Dual motor",
        wheelStyle: "nova",
        wheelRadius: 0.34,
        caliper: "#35383d",
      },
      {
        id: "p",
        name: "Performance",
        subtitle: "Sport wheels · red calipers · spoiler",
        wheelStyle: "sport",
        wheelRadius: 0.35,
        caliper: "#cc1825",
        spoiler: true,
        lowered: 0.02,
      },
    ],
    interiors: [INTERIORS.black, INTERIORS.white],
  },
  {
    ...VEHICLES[0],
    id: "model-s-heritage",
    name: "Model S",
    tag: "Original design",
    features: heritageFeatures,
    variants: [
      {
        id: "85",
        name: "85",
        subtitle: "Rear-wheel drive",
        wheelStyle: "nova",
        wheelRadius: 0.35,
        caliper: "#35383d",
      },
      {
        id: "p85",
        name: "P85",
        subtitle: "Performance · red calipers · spoiler",
        wheelStyle: "sport",
        wheelRadius: 0.36,
        caliper: "#cc1825",
        spoiler: true,
      },
    ],
    interiors: [INTERIORS.black, INTERIORS.cream],
  },
);

export function vehicleById(id: ModelId): VehicleDef {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}

export const EMPTY_OPEN: Record<PartId, boolean> = {
  "door-fl": false,
  "door-fr": false,
  "door-rl": false,
  "door-rr": false,
  frunk: false,
  trunk: false,
  charge: false,
  tonneau: false,
};

export function featuresForVehicle(
  def: VehicleDef,
  variantId: string,
): Feature[] {
  const variant = def.variants.find((v) => v.id === variantId);
  return variant?.spoiler || variant?.id === "beast"
    ? [
        ...def.features,
        {
          id: "performance",
          label: "Performance details",
          hint: "A closer look at this trim’s sport hardware.",
        },
      ]
    : def.features;
}
