import type { FeatureId, ModelId } from "../catalog";
export const SHOTS: Record<
  FeatureId | "overview",
  { position: [number, number, number]; target: [number, number, number] }
> = {
  performance: { position: [4.3, 1.5, -3.2], target: [0.55, 0.45, -1.15] },
  overview: { position: [5.8, 2.7, -7.4], target: [0, 0.75, 0] },
  headlights: { position: [2.5, 1.35, -5.7], target: [0, 0.8, -1.55] },
  lightbar: { position: [0.5, 1.45, -6], target: [0, 0.95, -1.3] },
  doors: { position: [-5.8, 2.5, -3.1], target: [0, 0.85, -0.05] },
  butterfly: { position: [-5.5, 2.4, -4.8], target: [0, 1, 0] },
  frunk: { position: [-3.1, 3.6, -4.8], target: [0, 0.85, -1.2] },
  trunk: { position: [3.4, 3.1, 5.7], target: [0, 0.8, 1.2] },
  charge: { position: [-3.7, 1.9, 3.5], target: [-0.7, 0.8, 1.45] },
  suspension: { position: [6.8, 1.55, -0.7], target: [0, 0.85, 0] },
  tonneau: { position: [3.8, 4.4, 5.5], target: [0, 1, 1.1] },
  interior: { position: [-0.48, 1.24, 0.75], target: [0, 1, -0.9] },
};

const MODEL_SHOTS: Partial<
  Record<
    ModelId,
    Partial<
      Record<
        FeatureId | "overview",
        { position: [number, number, number]; target: [number, number, number] }
      >
    >
  >
> = {
  cybertruck: {
    overview: { position: [7.4, 3.2, -8.8], target: [0, 0.95, 0] },
    headlights: { position: [3.1, 1.45, -7.2], target: [0, 0.9, -2.2] },
    lightbar: { position: [0.4, 1.6, -7.4], target: [0, 1.05, -2.1] },
    doors: { position: [-7.2, 2.7, -3.4], target: [0, 1.05, 0] },
    frunk: { position: [-3.6, 4.2, -5.8], target: [0, 1.05, -1.6] },
    trunk: { position: [4.2, 3.6, 7.1], target: [0, 1.05, 1.8] },
    tonneau: { position: [4.6, 5.1, 6.6], target: [0, 1.25, 1.5] },
    charge: { position: [-4.4, 2.1, 4.6], target: [-0.85, 1.05, 2.2] },
    suspension: { position: [8.2, 1.7, -0.8], target: [0, 1, 0] },
    interior: { position: [-0.5, 1.45, 0.85], target: [0, 1.2, -1.05] },
  },
  cybercab: {
    overview: { position: [4.9, 2.2, -6.2], target: [0, 0.62, 0] },
    headlights: { position: [2.1, 1.15, -4.8], target: [0, 0.7, -1.4] },
    lightbar: { position: [0.3, 1.2, -5.1], target: [0, 0.78, -1.3] },
    butterfly: { position: [-4.8, 2.3, -4.0], target: [0, 0.95, 0] },
    frunk: { position: [-2.6, 3.0, -4.0], target: [0, 0.7, -1.0] },
    interior: { position: [-0.4, 1.05, 0.55], target: [0, 0.9, -0.7] },
  },
  "model-y": {
    overview: { position: [6.1, 2.85, -7.7], target: [0, 0.85, 0] },
    lightbar: { position: [0.45, 1.5, -6.3], target: [0, 0.92, -1.55] },
    interior: { position: [-0.48, 1.32, 0.78], target: [0, 1.08, -0.95] },
  },
};

export function shotFor(
  model: ModelId,
  feature: FeatureId | "overview",
) {
  return MODEL_SHOTS[model]?.[feature] ?? SHOTS[feature];
}
