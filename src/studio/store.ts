import { create } from "zustand";
import {
  EMPTY_OPEN,
  vehicleById,
  type FeatureId,
  type ModelId,
  type PartId,
} from "./catalog";

type StudioState = {
  modelId: ModelId;
  variantId: string;
  exteriorId: string;
  interiorId: string;
  open: Record<PartId, boolean>;
  feature: FeatureId | null;
  hoverPart: PartId | null;
  autoRotate: boolean;
  ride: number;
  lightsOn: boolean;
  lightBarOn: boolean;
  setModel: (id: ModelId) => void;
  setVariant: (id: string) => void;
  setExterior: (id: string) => void;
  setInterior: (id: string) => void;
  togglePart: (id: PartId) => void;
  setOpen: (id: PartId, value: boolean) => void;
  setFeature: (id: FeatureId | null) => void;
  setHover: (id: PartId | null) => void;
  setAutoRotate: (v: boolean) => void;
  setRide: (v: number) => void;
  setLightsOn: (v: boolean) => void;
  setLightBarOn: (v: boolean) => void;
  resetPose: () => void;
};

export const useStudio = create<StudioState>((set, get) => ({
  modelId: "model-y",
  variantId: "lr",
  exteriorId: "stealth-grey",
  interiorId: "black",
  open: { ...EMPTY_OPEN },
  feature: null,
  hoverPart: null,
  autoRotate: true,
  ride: 0,
  lightsOn: true,
  lightBarOn: true,
  setModel: (id) => {
    const v = vehicleById(id);
    const paint =
      v.exteriors.find((p) => p.id === get().exteriorId) ?? v.exteriors[0];
    const interior =
      v.interiors.find((p) => p.id === get().interiorId) ?? v.interiors[0];
    set({
      modelId: id,
      variantId: v.variants[0].id,
      exteriorId: paint.id,
      interiorId: interior.id,
      open: { ...EMPTY_OPEN },
      feature: null,
      ride: 0,
      lightsOn: true,
      lightBarOn: true,
    });
  },
  setVariant: (id) => set({ variantId: id }),
  setExterior: (id) => set({ exteriorId: id }),
  setInterior: (id) => set({ interiorId: id }),
  togglePart: (id) =>
    set((s) => ({ open: { ...s.open, [id]: !s.open[id] } })),
  setOpen: (id, value) => set((s) => ({ open: { ...s.open, [id]: value } })),
  setFeature: (id) => set({ feature: id }),
  setHover: (id) => set({ hoverPart: id }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setRide: (v) => set({ ride: v }),
  setLightsOn: (v) => set({ lightsOn: v }),
  setLightBarOn: (v) => set({ lightBarOn: v }),
  resetPose: () =>
    set({
      open: { ...EMPTY_OPEN },
      feature: null,
      ride: 0,
      autoRotate: true,
    }),
}));
