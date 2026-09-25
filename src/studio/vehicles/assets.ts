/** Runtime GLB paths under `public/models/`. Highland and Juniper stay on their
 * credited imports. Cybertruck uses the in-repo Nieve5677 CC BY mesh.
 * Cybercab stays on the authored study until a CC BY download is present. */
export function vehicleGlb(model: string): string {
  switch (model) {
    case "model-3":
      return "highland/model.glb";
    case "model-y":
      return "juniper/model.glb";
    case "cybertruck":
      return "cybertruck-import/model.glb";
    case "cybercab":
      return "authored/cybercab.glb";
    default:
      return `authored/${model}.glb`;
  }
}

export function usesImportedPresentation(model: string): boolean {
  return model === "model-y" || model === "cybertruck";
}
