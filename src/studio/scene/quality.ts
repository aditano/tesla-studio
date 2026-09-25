export type RenderQuality = "auto" | "high" | "low";

/** Auto follows viewport width. Low and high are explicit and ignore it. */
export function prefersHighQuality(
  quality: RenderQuality,
  viewportWidth: number,
): boolean {
  switch (quality) {
    case "high":
      return true;
    case "low":
      return false;
    case "auto":
      return viewportWidth >= 768;
    default: {
      const unreachable: never = quality;
      return unreachable;
    }
  }
}
