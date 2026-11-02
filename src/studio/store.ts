import { create } from "zustand";
import {
  EMPTY_OPEN,
  vehicleById,
  featuresForVehicle,
  type FeatureId,
  type ModelId,
  type PartId,
} from "./catalog";
import type { BackdropId } from "./scene/backdrops";
import type { RenderQuality } from "./scene/quality";

const LIGHTS_KEY = "tesla-studio:lightsOn";
const LIGHT_BAR_KEY = "tesla-studio:lightBarOn";

function readFlag(key: string, fallback: boolean): boolean {
  if (typeof sessionStorage === "undefined") return fallback;
  try {
    const value = sessionStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    // Private mode or blocked storage should not break the studio.
  }
  return fallback;
}

function writeFlag(key: string, value: boolean) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // Ignore quota / privacy errors.
  }
}

type StudioState = {
  environment: BackdropId;
  quality: RenderQuality;
  cameraRevision: number;
  demoFeature: FeatureId | null;
  setDemoFeature: (id: FeatureId | null) => void;
  setEnvironment: (id: BackdropId) => void;
  setQuality: (id: RenderQuality) => void;
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
  setLightsOn: (v: boolean, persist?: boolean) => void;
  setLightBarOn: (v: boolean, persist?: boolean) => void;
  resetPose: () => void;
};

export const useStudio = create<StudioState>((set, get) => ({
  environment: "studio",
  quality: "auto",
  cameraRevision: 0,
  demoFeature: null,
  setDemoFeature: (demoFeature) => set({ demoFeature }),
  setEnvironment: (environment) => set({ environment }),
  setQuality: (quality) => set({ quality }),
  modelId: "model-3",
  variantId: "lr",
  exteriorId: "ultra-red",
  interiorId: "black",
  open: { ...EMPTY_OPEN },
  feature: null,
  hoverPart: null,
  autoRotate: false,
  ride: 0,
  lightsOn: readFlag(LIGHTS_KEY, true),
  lightBarOn: readFlag(LIGHT_BAR_KEY, true),
  setModel: (id) => {
    const v = vehicleById(id);
    const paint =
      v.exteriors.find((p) => p.id === get().exteriorId) ?? v.exteriors[0];
    const interior =
      v.interiors.find((p) => p.id === get().interiorId) ?? v.interiors[0];
    // Keep lamp preferences across vehicle switches; sessionStorage restores
    // them after a full reload as well.
    set({
      modelId: id,
      demoFeature: null,
      cameraRevision: get().cameraRevision + 1,
      variantId: v.variants[0].id,
      exteriorId: paint.id,
      interiorId: interior.id,
      open: { ...EMPTY_OPEN },
      feature: null,
      ride: 0,
    });
  },
  setVariant: (id) => {
    const def = vehicleById(get().modelId);
    if (!def.variants.some((v) => v.id === id)) return;
    const feature = get().feature;
    if (feature && !featuresForVehicle(def, id).some((f) => f.id === feature))
      get().resetPose();
    set({ variantId: id });
  },
  setExterior: (id) => {
    if (vehicleById(get().modelId).exteriors.some((p) => p.id === id))
      set({ exteriorId: id });
  },
  setInterior: (id) => {
    if (vehicleById(get().modelId).interiors.some((p) => p.id === id))
      set({ interiorId: id });
  },
  togglePart: (id) => set((s) => ({ open: { ...s.open, [id]: !s.open[id] } })),
  setOpen: (id, value) => set((s) => ({ open: { ...s.open, [id]: value } })),
  setFeature: (id) => {
    if (
      id &&
      !featuresForVehicle(vehicleById(get().modelId), get().variantId).some(
        (f) => f.id === id,
      )
    )
      return;
    set({
      feature: id,
      demoFeature: null,
      open: { ...EMPTY_OPEN },
      autoRotate: false,
      cameraRevision: get().cameraRevision + 1,
    });
  },
  setHover: (id) => set({ hoverPart: id }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setRide: (v) => set({ ride: v }),
  setLightsOn: (v, persist = true) => {
    if (persist) writeFlag(LIGHTS_KEY, v);
    set({ lightsOn: v });
  },
  setLightBarOn: (v, persist = true) => {
    if (persist) writeFlag(LIGHT_BAR_KEY, v);
    set({ lightBarOn: v });
  },
  resetPose: () =>
    set({
      open: { ...EMPTY_OPEN },
      feature: null,
      demoFeature: null,
      cameraRevision: get().cameraRevision + 1,
      ride: 0,
      autoRotate: false,
    }),
}));

// Debug handle for the dev server only; production bundles don't expose state.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { __teslaStudio: typeof useStudio }).__teslaStudio =
    useStudio;
}
