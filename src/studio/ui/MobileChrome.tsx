import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  DoorOpen,
  Lamp,
  Lightbulb,
  Luggage,
  Package,
  Plug,
  RotateCcw,
  Square,
  UnfoldVertical,
  type LucideIcon,
} from "lucide-react";
import { VEHICLES, vehicleById, type FeatureId, type ModelId } from "../catalog";
import { useStudio } from "../store";

const FEATURE_ICON: Record<FeatureId, LucideIcon> = {
  lightbar: Lamp,
  headlights: Lightbulb,
  doors: DoorOpen,
  frunk: Luggage,
  trunk: Package,
  charge: Plug,
  suspension: ArrowUpDown,
  tonneau: Square,
  butterfly: UnfoldVertical,
};

export function MobileChrome() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const modelId = useStudio((s) => s.modelId);
  const variantId = useStudio((s) => s.variantId);
  const exteriorId = useStudio((s) => s.exteriorId);
  const interiorId = useStudio((s) => s.interiorId);
  const feature = useStudio((s) => s.feature);
  const setModel = useStudio((s) => s.setModel);
  const setVariant = useStudio((s) => s.setVariant);
  const setExterior = useStudio((s) => s.setExterior);
  const setInterior = useStudio((s) => s.setInterior);
  const setFeature = useStudio((s) => s.setFeature);
  const setLightsOn = useStudio((s) => s.setLightsOn);
  const lightsOn = useStudio((s) => s.lightsOn);
  const setLightBarOn = useStudio((s) => s.setLightBarOn);
  const lightBarOn = useStudio((s) => s.lightBarOn);
  const reset = useStudio((s) => s.resetPose);
  const setAutoRotate = useStudio((s) => s.setAutoRotate);
  const def = vehicleById(modelId);
  const variant = def.variants.find((v) => v.id === variantId) ?? def.variants[0];
  const paint = def.exteriors.find((p) => p.id === exteriorId) ?? def.exteriors[0];
  const interior = def.interiors.find((p) => p.id === interiorId) ?? def.interiors[0];

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [pickerOpen]);

  const onFeature = (id: FeatureId) => {
    if (feature === id) {
      setFeature(null);
      return;
    }
    setFeature(id);
    if (id === "headlights") setLightsOn(!lightsOn);
    if (id === "lightbar") setLightBarOn(!lightBarOn);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 px-3 pt-safe">
        <div className="flex items-center gap-2" ref={pickerRef}>
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setPickerOpen((v) => !v);
                setSheetOpen(false);
              }}
              className="glass flex min-h-11 w-full items-center gap-3 rounded-pill px-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-2xs font-medium tracking-label text-subtle uppercase">
                  Tesla Studio
                </span>
                <span className="block truncate text-sm font-medium text-fg">{def.name}</span>
              </span>
              <ChevronDown
                className={
                  "size-4 shrink-0 text-subtle transition-transform duration-200 " +
                  (pickerOpen ? "rotate-180" : "")
                }
                strokeWidth={1.75}
              />
            </button>
            {pickerOpen ? (
              <ul
                role="listbox"
                className="glass absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-panel p-1"
              >
                {VEHICLES.map((v) => {
                  const active = v.id === modelId;
                  return (
                    <li key={v.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => {
                          setModel(v.id as ModelId);
                          setPickerOpen(false);
                        }}
                        className={
                          "flex min-h-11 w-full items-center justify-between rounded-chip px-3 text-left " +
                          (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                        }
                      >
                        <span>
                          <span className="block text-sm font-medium">{v.name}</span>
                          <span className={"block text-xs " + (active ? "text-bg/70" : "text-subtle")}>
                            {v.tag}
                          </span>
                        </span>
                        {active ? <Check className="size-4" strokeWidth={1.75} /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              setAutoRotate(true);
              setPickerOpen(false);
            }}
            className="glass flex size-11 shrink-0 items-center justify-center rounded-full text-fg"
            aria-label="Reset view"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <footer className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 px-3 pb-safe">
        <div className="glass mb-3 overflow-hidden rounded-panel">
          <ul className="flex flex-nowrap gap-1 overflow-x-auto px-2 py-2 no-scrollbar">
            {def.features.map((f) => {
              const active = feature === f.id;
              const Icon = FEATURE_ICON[f.id];
              return (
                <li key={f.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onFeature(f.id)}
                    className={
                      "flex min-h-11 items-center gap-2 rounded-chip px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 " +
                      (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                    }
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {f.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => {
              setSheetOpen((v) => !v);
              setPickerOpen(false);
            }}
            aria-expanded={sheetOpen}
            className="flex w-full items-center gap-3 border-t border-line/10 px-4 py-3 text-left"
          >
            <span
              className="size-6 shrink-0 rounded-full border border-line/30"
              style={{ background: paint.hex }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg">
                {def.name}
                <span className="text-muted"> · {def.tag}</span>
              </span>
              <span className="block truncate text-xs text-muted">
                {variant.name} · {paint.name}
              </span>
            </span>
            <ChevronDown
              className={
                "size-4 shrink-0 text-subtle transition-transform duration-200 " +
                (sheetOpen ? "rotate-180" : "")
              }
              strokeWidth={1.75}
            />
          </button>

          <div
            className={
              "grid sheet-collapse " + (sheetOpen ? "grid-rows-open" : "grid-rows-closed")
            }
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="max-h-sheet overflow-y-auto px-4 pb-4"
                inert={!sheetOpen ? true : undefined}
                aria-hidden={!sheetOpen}
              >
                <p className="pt-1 text-2xs font-medium tracking-label text-subtle uppercase">
                  Drive
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {def.variants.map((v) => {
                    const active = v.id === variantId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariant(v.id)}
                        className={
                          "flex min-h-11 items-center justify-between rounded-chip px-3 text-left transition-colors duration-200 " +
                          (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                        }
                      >
                        <span className="text-sm font-medium">{v.name}</span>
                        <span className={"text-xs " + (active ? "text-bg/70" : "text-subtle")}>
                          {v.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-2xs font-medium tracking-label text-subtle uppercase">
                  Exterior
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {def.exteriors.map((p) => {
                    const active = p.id === exteriorId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={p.name}
                        aria-label={p.name}
                        onClick={() => setExterior(p.id)}
                        className={
                          "size-11 rounded-full border transition-transform duration-150 " +
                          (active ? "scale-110 border-fg" : "border-line/30")
                        }
                        style={{ background: p.hex }}
                      />
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">{paint.name}</p>

                <p className="mt-4 text-2xs font-medium tracking-label text-subtle uppercase">
                  Interior
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {def.interiors.map((p) => {
                    const active = p.id === interiorId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={p.name}
                        aria-label={p.name}
                        onClick={() => setInterior(p.id)}
                        className={
                          "size-11 rounded-full border transition-transform duration-150 " +
                          (active ? "scale-110 border-fg" : "border-line/30")
                        }
                        style={{ background: p.leather }}
                      />
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">{interior.name}</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
