import type { FeatureId } from "../catalog";
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
