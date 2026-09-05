import { vehicleById, type FeatureId } from "../catalog";
import { useStudio } from "../store";

export function FeatureDock() {
  const modelId = useStudio((s) => s.modelId);
  const feature = useStudio((s) => s.feature);
  const setFeature = useStudio((s) => s.setFeature);
  const setLightsOn = useStudio((s) => s.setLightsOn);
  const lightsOn = useStudio((s) => s.lightsOn);
  const setLightBarOn = useStudio((s) => s.setLightBarOn);
  const lightBarOn = useStudio((s) => s.lightBarOn);
  const def = vehicleById(modelId);

  const onClick = (id: FeatureId) => {
    if (feature === id) {
      setFeature(null);
      return;
    }
    setFeature(id);
    if (id === "headlights") setLightsOn(!lightsOn);
    if (id === "lightbar") setLightBarOn(!lightBarOn);
  };

  return (
    <aside className="pointer-events-auto absolute top-20 right-3 left-3 z-20 md:top-auto md:right-auto md:bottom-4 md:left-4 md:w-[18rem]">
      <div className="glass rounded-panel p-2 md:p-3">
        <p className="hidden px-2 pb-2 text-[0.65rem] font-medium tracking-[0.22em] text-subtle uppercase md:block">
          Features
        </p>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {def.features.map((f) => {
            const active = feature === f.id;
            return (
              <li key={f.id} className="shrink-0 md:shrink">
                <button
                  type="button"
                  onClick={() => onClick(f.id)}
                  className={
                    "flex min-h-11 w-full items-center justify-between rounded-chip px-3 py-2 text-left transition-colors duration-200 " +
                    (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                  }
                >
                  <span className="text-sm font-medium whitespace-nowrap">{f.label}</span>
                  <span className={"ml-3 hidden text-xs md:inline " + (active ? "text-bg/70" : "text-subtle")}>
                    {f.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
