import { vehicleById } from "../catalog";
import { useStudio } from "../store";
import { Cybercab } from "./Cybercab";
import { Cybertruck } from "./Cybertruck";
import { PassengerCar } from "./PassengerCar";

export function ActiveVehicle() {
  const modelId = useStudio((s) => s.modelId);
  const variantId = useStudio((s) => s.variantId);
  const exteriorId = useStudio((s) => s.exteriorId);
  const interiorId = useStudio((s) => s.interiorId);
  const def = vehicleById(modelId);
  const variant = def.variants.find((v) => v.id === variantId) ?? def.variants[0];
  const paint = def.exteriors.find((p) => p.id === exteriorId) ?? def.exteriors[0];
  const interior = def.interiors.find((p) => p.id === interiorId) ?? def.interiors[0];

  if (modelId === "model-3" || modelId === "model-y") {
    return <PassengerCar kind={modelId} paint={paint} interior={interior} variant={variant} />;
  }
  if (modelId === "cybertruck") {
    return <Cybertruck paint={paint} interior={interior} variant={variant} />;
  }
  return <Cybercab paint={paint} interior={interior} variant={variant} />;
}
