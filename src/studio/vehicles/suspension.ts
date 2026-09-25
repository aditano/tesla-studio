import type { Object3D } from "three";
import type { FeatureId } from "../catalog";

const WHEEL_NAMES = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"] as const;

/** Tires live in the body group, so translating that group would lift them. */
export function wheelsShareBody(scene: Object3D): boolean {
  const body = scene.getObjectByName("body");
  if (!body) return true;
  return !WHEEL_NAMES.every((name) => {
    const wheel = scene.getObjectByName(name);
    if (!wheel || wheel.children.length === 0) return false;
    let parent: Object3D | null = wheel.parent;
    while (parent) {
      if (parent === body) return false;
      parent = parent.parent;
    }
    return true;
  });
}

/** Extra metres added while the suspension demo plays.
 * Zero when the wheels are part of the body — that lift would pick the tires up. */
export function suspensionLift(
  feature: FeatureId | null,
  reducedMotion: boolean,
  elapsed: number,
  wheelsLockedToBody: boolean,
): number {
  if (feature !== "suspension" || wheelsLockedToBody) return 0;
  if (reducedMotion) return 0.13;
  return 0.13 * (1 - Math.cos(elapsed * 1.5));
}
