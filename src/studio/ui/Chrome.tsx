import { RotateCcw } from "lucide-react";
import { vehicleById, type PartId } from "../catalog";
import { useStudio } from "../store";

const PART_LABEL: Record<PartId, string> = {
  "door-fl": "Driver door",
  "door-fr": "Passenger door",
  "door-rl": "Rear left door",
  "door-rr": "Rear right door",
  frunk: "Frunk",
  trunk: "Trunk",
  charge: "Charge port",
  tonneau: "Tonneau cover",
};

export function Wordmark() {
  return (
    <div className="pointer-events-none absolute top-5 left-5 z-20 hidden md:block">
      <p className="text-xs font-medium tracking-brand text-fg/90">TESLA</p>
      <p className="mt-1 text-2xs tracking-label text-subtle">STUDIO</p>
    </div>
  );
}

export function ResetButton() {
  const reset = useStudio((s) => s.resetPose);
  const setAutoRotate = useStudio((s) => s.setAutoRotate);
  return (
    <button
      type="button"
      onClick={() => {
        reset();
        setAutoRotate(true);
      }}
      className="glass pointer-events-auto absolute top-4 right-4 z-20 hidden size-11 items-center justify-center rounded-full text-fg md:flex"
      aria-label="Reset view"
    >
      <RotateCcw className="size-4" strokeWidth={1.75} />
    </button>
  );
}

export function Hint() {
  const hover = useStudio((s) => s.hoverPart);
  const modelId = useStudio((s) => s.modelId);
  const def = vehicleById(modelId);
  const label = hover ? PART_LABEL[hover] : null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 md:block">
      <div className="glass-quiet rounded-pill px-4 py-2 text-center">
        <p className="text-xs tracking-wide text-muted">
          {label ?? `Drag to orbit · Click panels to open · ${def.name}`}
        </p>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden w-full max-w-xl -translate-x-1/2 text-center text-2xs tracking-wide text-subtle/80 md:block">
      Unofficial visualization. Tesla and model names are trademarks of Tesla, Inc.
    </p>
  );
}
