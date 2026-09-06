import { vehicleById } from "../catalog";
import { useStudio } from "../store";
import { HeritageVehicle } from "./HeritageVehicle";
import { AuthoredVehicle } from "./AuthoredVehicle";

export function ActiveVehicle() {
  const modelId = useStudio((s) => s.modelId);
  const variantId = useStudio((s) => s.variantId);
  const exteriorId = useStudio((s) => s.exteriorId);
  const interiorId = useStudio((s) => s.interiorId);
  const def = vehicleById(modelId);
  const variant =
    def.variants.find((v) => v.id === variantId) ?? def.variants[0];
  const paint =
    def.exteriors.find((p) => p.id === exteriorId) ?? def.exteriors[0];
  const interior =
    def.interiors.find((p) => p.id === interiorId) ?? def.interiors[0];

  if (modelId === "model-3-heritage" || modelId === "model-s-heritage")
    return (
      <HeritageVehicle
        model={modelId}
        paint={paint}
        interior={interior}
        variant={variant}
      />
    );

  return <AuthoredVehicle model={modelId} paint={paint} interior={interior} variant={variant} />;
}
