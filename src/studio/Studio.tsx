import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Sun,
  X,
} from "lucide-react";
import { VEHICLES, vehicleById, featuresForVehicle } from "./catalog";
import { useStudio } from "./store";
const VehicleCanvas = lazy(() =>
  import("./scene/VehicleCanvas").then((m) => ({ default: m.VehicleCanvas })),
);

class RenderBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="render-error">
        <h2>The studio couldn’t load.</h2>
        <p>Check your connection, then try again.</p>
        <button onClick={() => location.reload()}>Reload studio</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const featureCopy: Record<string, string> = {
  performance:
    "This trim adds a distinct sport treatment. Move closer to inspect its wheels and brake hardware.",
  headlights:
    "Explore the shape and detail of the front lighting. The studio camera brings the lamps into focus.",
  lightbar:
    "A continuous light signature defines the front of the vehicle. Watch the illuminated blade come to life.",
  doors:
    "The camera moves alongside the vehicle as the doors open, revealing the cabin beyond.",
  frunk:
    "With no engine under the hood, the front compartment creates another place to carry your essentials.",
  trunk: "See the rear cargo area from above as the rear opening lifts.",
  charge:
    "The charge port sits behind a small flap on the driver-side rear quarter.",
  suspension:
    "Watch the body change ride height while the wheels stay planted on the studio floor.",
  tonneau:
    "The powered cover retracts toward the cabin to reveal the pickup bed.",
  butterfly: "The doors lift up and outward to reveal the two-seat cabin.",
  interior:
    "Step inside for a closer view of the seating and dashboard. Drag to look around, then return to the exterior.",
};

export function Studio() {
  const s = useStudio();
  const def = useMemo(() => {
    const base = vehicleById(s.modelId);
    return { ...base, features: featuresForVehicle(base, s.variantId) };
  }, [s.modelId, s.variantId]);
  const variant =
    def.variants.find((v) => v.id === s.variantId) ?? def.variants[0];
  const paint =
    def.exteriors.find((p) => p.id === s.exteriorId) ?? def.exteriors[0];
  const active = def.features.find((f) => f.id === s.feature);
  const [panel, setPanel] = useState<"configure" | "explore">("configure");
  const [tour, setTour] = useState(false);
  const [help, setHelp] = useState(false);
  const [lost, setLost] = useState(false);
  const [sheet, setSheet] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!help && !lost) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".help-modal");
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button,a[href],select,[tabindex="0"]',
        ) ?? [],
      );
    getFocusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusable(),
        first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [help, lost]);
  useEffect(() => {
    const stop = () => setTour(false);
    window.addEventListener("studio-manual-orbit", stop);
    return () => window.removeEventListener("studio-manual-orbit", stop);
  }, []);
  const heritage = s.modelId.includes("heritage");
  useEffect(() => {
    if (!s.feature) {
      s.setDemoFeature(null);
      return;
    }
    const timer = window.setTimeout(
      () => s.setDemoFeature(s.feature),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200,
    );
    return () => window.clearTimeout(timer);
  }, [s.feature, s.cameraRevision, s.setDemoFeature]);
  useEffect(() => {
    setTour(false);
  }, [s.modelId, s.variantId]);
  useEffect(() => {
    if (s.demoFeature !== "headlights") return;
    s.setLightsOn(false);
    const timer = window.setTimeout(() => s.setLightsOn(true), 350);
    return () => {
      window.clearTimeout(timer);
      s.setLightsOn(true);
    };
  }, [s.demoFeature, s.setLightsOn]);
  useEffect(() => {
    if (!tour) return;
    const timer = window.setTimeout(() => {
      const index = def.features.findIndex((f) => f.id === s.feature);
      if (index === def.features.length - 1) {
        setTour(false);
        s.resetPose();
      } else s.setFeature(def.features[index + 1].id);
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [tour, s.feature, def, s.setFeature, s.resetPose]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        setTour(false);
        s.resetPose();
      }
    };
    const loss = () => setLost(true);
    window.addEventListener("keydown", key);
    window.addEventListener("studio-context-lost", loss);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("studio-context-lost", loss);
    };
  }, [s.resetPose]);
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  function next(direction: number) {
    setTour(false);
    const i = def.features.findIndex((f) => f.id === s.feature);
    s.setFeature(
      def.features[(i + direction + def.features.length) % def.features.length]
        .id,
    );
  }
  return (
    <main
      className={`studio-app environment-${s.environment} ${sheet ? "sheet-open" : "sheet-closed"}`}
    >
      <div className="vehicle-stage">
        <RenderBoundary>
          <Suspense
            fallback={
              <div className="boot">
                <span className="eyebrow">TESLA STUDIO</span>
                <p>Setting the scene</p>
              </div>
            }
          >
            <VehicleCanvas />
          </Suspense>
        </RenderBoundary>
      </div>
      <header className="studio-header">
        <a
          href={import.meta.env.BASE_URL}
          className="wordmark"
          aria-label="Tesla Studio home"
        >
          TESLA<span>STUDIO</span>
        </a>
        <div className="header-caption">
          An independent automotive experience
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            title="Help and credits"
            aria-label="Help and credits"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={18} />
          </button>
          {document.fullscreenEnabled && (
            <button
              className="icon-button fullscreen"
              title="Fullscreen"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else
                  void document.documentElement
                    .requestFullscreen()
                    .catch(() => {});
              }}
            >
              <Maximize size={18} />
            </button>
          )}
        </div>
      </header>
      <nav className="model-nav" aria-label="Vehicle selection">
        {VEHICLES.map((v) => (
          <button
            key={v.id}
            className={v.id === s.modelId ? "selected" : ""}
            aria-pressed={v.id === s.modelId}
            onClick={() => {
              s.setModel(v.id);
              setTour(false);
            }}
          >
            {v.name}
            <span>{v.tag}</span>
          </button>
        ))}
      </nav>
      <section className="vehicle-title" aria-label="Selected vehicle">
        <p className="eyebrow">
          {heritage
            ? "HERITAGE COLLECTION"
            : s.modelId === "cybercab"
              ? "CONCEPT COLLECTION"
              : "DESIGN COLLECTION"}
        </p>
        <h1>
          {def.name}
          <span>{def.tag}</span>
        </h1>
        <p className="trim-line">
          {variant.name}
          <span />
          {paint.name}
        </p>
      </section>
      <div className="stage-tools">
        <button
          className={`tool-pill ${s.autoRotate ? "active" : ""}`}
          aria-pressed={s.autoRotate}
          onClick={() => {
            setTour(false);
            if (s.feature) s.setFeature(null);
            s.setAutoRotate(!s.autoRotate);
          }}
        >
          {s.autoRotate ? <Pause size={14} /> : <Play size={14} />}
          <span>Orbit</span>
        </button>
        <button
          className="tool-pill"
          onClick={() => {
            setTour(false);
            s.resetPose();
          }}
        >
          <RotateCcw size={14} />
          <span>Reset view</span>
        </button>
        <span className="orbit-hint">Drag to rotate · Scroll to zoom</span>
      </div>
      {active && (
        <section className="feature-caption" aria-live="polite">
          <p className="eyebrow">
            FEATURE {String(def.features.indexOf(active) + 1).padStart(2, "0")}{" "}
            / {String(def.features.length).padStart(2, "0")}
          </p>
          <h2>{active.label}</h2>
          <p>{featureCopy[active.id]}</p>
          <div className="caption-actions">
            <button onClick={() => next(-1)} aria-label="Previous feature">
              <ChevronLeft size={17} />
            </button>
            <button onClick={() => next(1)} aria-label="Next feature">
              <ChevronRight size={17} />
            </button>
            <button
              onClick={() => {
                setTour(false);
                s.resetPose();
              }}
            >
              Return to exterior <ArrowRight size={15} />
            </button>
          </div>
          {tour && (
            <div className="tour-progress" key={`${s.modelId}-${s.feature}`}>
              <span />
            </div>
          )}
        </section>
      )}
      <aside className="control-panel" aria-label="Vehicle studio controls">
        <button
          className="sheet-handle"
          aria-label={sheet ? "Collapse controls" : "Expand controls"}
          aria-expanded={sheet}
          onClick={() => setSheet(!sheet)}
        >
          <span />
        </button>
        <div className="panel-tabs" role="tablist" aria-label="Studio controls">
          <button
            role="tab"
            id="configure-tab"
            aria-controls="configure-panel"
            aria-selected={panel === "configure"}
            onClick={() => {
              setPanel("configure");
              setSheet(true);
            }}
          >
            Configure
          </button>
          <button
            role="tab"
            id="explore-tab"
            aria-controls="explore-panel"
            aria-selected={panel === "explore"}
            onClick={() => {
              setPanel("explore");
              setSheet(true);
            }}
          >
            Explore features <span>{def.features.length}</span>
          </button>
        </div>
        <div className="panel-content">
          {panel === "configure" ? (
            <div
              role="tabpanel"
              id="configure-panel"
              aria-labelledby="configure-tab"
            >
              <div className="section-label">
                <span>01 / VARIANT</span>
                <span>
                  {String(def.variants.length).padStart(2, "0")} OPTIONS
                </span>
              </div>
              <div className="variant-options">
                {def.variants.map((v) => (
                  <button
                    key={v.id}
                    aria-pressed={v.id === variant.id}
                    className={v.id === variant.id ? "selected" : ""}
                    onClick={() => s.setVariant(v.id)}
                  >
                    <span>
                      <strong>{v.name}</strong>
                      <small>{v.subtitle}</small>
                    </span>
                    <i />
                  </button>
                ))}
              </div>
              <div className="section-label">
                <span>02 / EXTERIOR</span>
                <span>{paint.name}</span>
              </div>
              <div className="paint-options">
                {def.exteriors.map((p) => (
                  <button
                    key={p.id}
                    aria-label={p.name}
                    title={p.name}
                    aria-pressed={p.id === paint.id}
                    className={p.id === paint.id ? "selected" : ""}
                    style={{ "--paint": p.hex } as React.CSSProperties}
                    onClick={() => s.setExterior(p.id)}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <div className="section-label">
                <span>03 / INTERIOR</span>
                <span>
                  {def.interiors.find((i) => i.id === s.interiorId)?.name}
                </span>
              </div>
              <div className="interior-options">
                {def.interiors.map((i) => (
                  <button
                    key={i.id}
                    aria-pressed={i.id === s.interiorId}
                    className={i.id === s.interiorId ? "selected" : ""}
                    onClick={() => s.setInterior(i.id)}
                  >
                    <span style={{ background: i.leather }} />
                    {i.name}
                  </button>
                ))}
              </div>
              <button
                className="primary-action"
                onClick={() => {
                  setPanel("explore");
                  s.setFeature(def.features[0].id);
                  setTour(true);
                }}
              >
                Take a guided tour <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div
              role="tabpanel"
              id="explore-panel"
              aria-labelledby="explore-tab"
            >
              <div className="section-label">
                <span>DISCOVER {def.name.toUpperCase()}</span>
                <button
                  className="text-button"
                  onClick={() => {
                    if (!tour) {
                      s.setFeature(def.features[0].id);
                    }
                    setTour(!tour);
                  }}
                >
                  {tour ? "Pause tour" : "Play all"}{" "}
                  {tour ? <Pause size={12} /> : <Play size={12} />}
                </button>
              </div>
              <div className="feature-options">
                {def.features.map((f, i) => (
                  <button
                    key={f.id}
                    className={s.feature === f.id ? "selected" : ""}
                    aria-pressed={s.feature === f.id}
                    onClick={() => {
                      setTour(false);
                      s.setFeature(s.feature === f.id ? null : f.id);
                    }}
                  >
                    <span className="feature-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{f.label}</strong>
                      <small>{f.hint}</small>
                    </span>
                    <ArrowDownLeft size={17} />
                  </button>
                ))}
              </div>
              <p className="feature-note">
                Select a feature to move the camera and watch its demonstration.
              </p>
            </div>
          )}
          <div className="lighting-controls">
            <div className="section-label">
              <span>
                <Sun size={13} /> ENVIRONMENT
              </span>
              <select
                aria-label="Render quality"
                value={s.quality}
                onChange={(e) =>
                  s.setQuality(e.target.value as "auto" | "high")
                }
              >
                <option value="auto">Auto quality</option>
                <option value="high">High quality</option>
              </select>
            </div>
            <div className="segmented">
              {(["studio", "daylight", "midnight"] as const).map((mode) => (
                <button
                  key={mode}
                  className={s.environment === mode ? "selected" : ""}
                  aria-pressed={s.environment === mode}
                  onClick={() => s.setEnvironment(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <footer className="studio-footer">
        <span>
          <i /> LIVE 3D
        </span>
        <span>
          {heritage
            ? "Artist-built mesh · Original-generation design"
            : "Procedural design study"}
          <b> / </b>Unofficial Tesla visualization
        </span>
      </footer>
      {(help || lost) && (
        <div className="modal-backdrop" onClick={() => !lost && setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            {!lost && (
              <button
                autoFocus
                className="icon-button close-modal"
                aria-label="Close help"
                onClick={() => setHelp(false)}
              >
                <X size={20} />
              </button>
            )}
            <p className="eyebrow">TESLA STUDIO</p>
            <h2 id="help-title">
              {lost ? "Let’s restart the renderer." : "Made to be explored."}
            </h2>
            {lost ? (
              <>
                <p>
                  Your browser interrupted the graphics context. Reload to
                  restore the studio.
                </p>
                <button
                  className="primary-action"
                  onClick={() => location.reload()}
                >
                  Reload studio
                </button>
              </>
            ) : (
              <>
                <p>
                  Drag to orbit. Pinch or scroll to zoom. Select a feature for a
                  camera move and animated demonstration. Press Escape to return
                  to the exterior.
                </p>
                <p>
                  Heritage models use detailed artist-created geometry.
                  Highland, Juniper, Cybertruck and Cybercab are procedural
                  design studies. Trim treatments, paints and articulated panels
                  are illustrative, not factory CAD or a current ordering guide.
                </p>
                <p>
                  Model 3 and Model S meshes by{" "}
                  <a
                    href="https://sketchfab.com/Steven007"
                    target="_blank"
                    rel="noreferrer"
                  >
                    iSteven
                  </a>
                  , licensed{" "}
                  <a
                    href="https://creativecommons.org/licenses/by-nc/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY-NC 4.0
                  </a>
                  . Adapted with new materials, normalization and demonstration
                  rigs.{" "}
                  <a
                    href={`${import.meta.env.BASE_URL}models/model-3-heritage/license.txt`}
                  >
                    Model 3 credit
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`${import.meta.env.BASE_URL}models/model-s-heritage/license.txt`}
                  >
                    Model S credit
                  </a>
                  .
                </p>
                <p>
                  Tesla and vehicle names are trademarks of Tesla, Inc. This
                  independent, noncommercial fan project is not affiliated with
                  Tesla.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
