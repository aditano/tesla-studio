import type { FeatureId, ModelId } from "../catalog";

type Shot = { position: [number, number, number]; target: [number, number, number] };

/** Feature cameras in metres. +Y up, −Z forward. shotFor() falls back to SHOTS.
 * Lengths: Highland 4.72, Juniper 4.79, heritage 4.69 / 4.97, Cybertruck 5.68, Cybercab 4.12. */
export const SHOTS: Record<FeatureId | "overview", Shot> = {
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
  interior: { position: [-0.4, 1.12, 0.32], target: [0.02, 0.94, -0.88] },
};

const MODEL_SHOTS: Partial<Record<ModelId, Partial<Record<FeatureId | "overview", Shot>>>> = {
  "model-3": {
    overview: { position: [5.7, 2.5, -7.15], target: [0, 0.72, -0.05] },
    headlights: { position: [2.15, 1.15, -5.15], target: [0, 0.68, -1.85] },
    doors: { position: [-5.15, 1.6, -2.05], target: [0, 0.78, 0.08] },
    frunk: { position: [-2.45, 3.1, -4.2], target: [0, 0.92, -1.55] },
    trunk: { position: [2.55, 2.55, 4.95], target: [0, 0.85, 1.72] },
    charge: { position: [-3.1, 1.48, 2.85], target: [-0.86, 0.82, 1.52] },
    interior: { position: [-0.36, 1.08, 0.22], target: [0.04, 0.92, -0.86] },
    performance: { position: [3.5, 1.02, -2.85], target: [0.74, 0.35, -1.49] },
  },
  "model-y": {
    overview: { position: [6.05, 2.8, -7.65], target: [0, 0.86, 0] },
    lightbar: { position: [0.4, 1.42, -6.15], target: [0, 0.95, -1.72] },
    headlights: { position: [2.25, 1.28, -5.35], target: [0, 0.78, -1.85] },
    doors: { position: [-5.35, 1.75, -2.15], target: [0, 0.88, 0.1] },
    frunk: { position: [-2.55, 3.35, -4.35], target: [0, 1.02, -1.52] },
    trunk: { position: [2.75, 2.95, 5.2], target: [0, 1.02, 1.7] },
    charge: { position: [-3.25, 1.62, 3.05], target: [-0.9, 0.95, 1.62] },
    interior: { position: [-0.38, 1.18, 0.28], target: [0.04, 1.0, -0.9] },
    performance: { position: [3.85, 1.12, -2.95], target: [0.78, 0.4, -1.5] },
  },
  "model-3-heritage": {
    overview: { position: [5.85, 2.55, -7.25], target: [0, 0.74, 0] },
    headlights: { position: [2.35, 1.22, -5.4], target: [0, 0.75, -1.7] },
    doors: { position: [-5.95, 2.1, -2.55], target: [0, 0.82, -0.2] },
    frunk: { position: [-2.7, 3.65, -4.55], target: [0, 0.95, -1.3] },
    trunk: { position: [3.05, 3.25, 5.25], target: [0, 0.95, 1.38] },
    interior: { position: [-0.38, 1.1, 0.32], target: [0.02, 0.93, -0.88] },
    performance: { position: [3.65, 1.08, -2.95], target: [0.72, 0.36, -1.45] },
  },
  "model-s-heritage": {
    overview: { position: [6.25, 2.7, -7.75], target: [0, 0.76, 0] },
    headlights: { position: [2.55, 1.28, -5.75], target: [0, 0.78, -1.85] },
    doors: { position: [-6.25, 2.2, -2.75], target: [0, 0.85, -0.15] },
    frunk: { position: [-2.9, 3.8, -4.85], target: [0, 0.98, -1.45] },
    trunk: { position: [3.25, 3.4, 5.65], target: [0, 0.98, 1.52] },
    interior: { position: [-0.4, 1.12, 0.42], target: [0.02, 0.94, -0.95] },
    performance: { position: [3.95, 1.12, -3.15], target: [0.74, 0.38, -1.55] },
  },
  cybertruck: {
    overview: { position: [7.0, 3.0, -8.2], target: [0, 1.0, 0.1] },
    headlights: { position: [2.8, 1.15, -6.4], target: [0, 0.62, -2.55] },
    lightbar: { position: [0.35, 1.35, -6.8], target: [0, 0.99, -2.55] },
    doors: { position: [-6.6, 2.4, -2.8], target: [0, 1.1, -0.4] },
    frunk: { position: [-3.2, 4.0, -5.4], target: [0, 1.15, -1.85] },
    trunk: { position: [3.8, 3.4, 6.6], target: [0, 1.0, 1.95] },
    tonneau: { position: [4.2, 4.6, 6.0], target: [0, 1.4, 1.85] },
    charge: { position: [-3.6, 1.65, 4.0], target: [-0.95, 1.06, 2.38] },
    suspension: { position: [7.6, 1.55, -0.6], target: [0, 0.95, 0] },
    interior: { position: [-0.42, 1.38, -0.08], target: [0.02, 1.16, -1.22] },
    performance: { position: [4.8, 1.2, -3.6], target: [0.82, 0.48, -1.96] },
  },
  cybercab: {
    overview: { position: [4.8, 2.1, -5.9], target: [0, 0.62, 0] },
    headlights: { position: [1.9, 1.05, -4.4], target: [0, 0.62, -1.55] },
    lightbar: { position: [0.25, 1.1, -4.7], target: [0, 0.72, -1.55] },
    butterfly: { position: [-4.6, 2.2, -3.6], target: [0, 0.92, -0.15] },
    frunk: { position: [-2.4, 2.8, -3.6], target: [0, 0.72, -0.95] },
    interior: { position: [-0.3, 0.86, 0.08], target: [0, 0.78, -0.72] },
  },
};

export function shotFor(
  model: ModelId,
  feature: FeatureId | "overview",
) {
  return MODEL_SHOTS[model]?.[feature] ?? SHOTS[feature];
}
