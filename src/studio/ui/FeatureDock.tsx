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
    <aside className="pointer-events-auto absolute bottom-4 left-4 z-20 hidden w-72 md:block">
      <div className="glass rounded-panel p-3">
        <p className="px-2 pb-2 text-2xs font-medium tracking-label text-subtle uppercase">
          Features
        </p>
        <ul className="flex flex-col gap-1">
          {def.features.map((f) => {
            const active = feature === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onClick(f.id)}
                  className={
                    "flex min-h-11 w-full items-center justify-between rounded-chip px-3 py-2 text-left transition-colors duration-200 " +
                    (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                  }
                >
                  <span className="text-sm font-medium whitespace-nowrap">{f.label}</span>
                  <span className={"ml-3 text-xs " + (active ? "text-bg/70" : "text-subtle")}>
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
