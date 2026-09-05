import { vehicleById } from "../catalog";
import { useStudio } from "../store";

export function ConfigDock() {
  const modelId = useStudio((s) => s.modelId);
  const variantId = useStudio((s) => s.variantId);
  const exteriorId = useStudio((s) => s.exteriorId);
  const interiorId = useStudio((s) => s.interiorId);
  const setVariant = useStudio((s) => s.setVariant);
  const setExterior = useStudio((s) => s.setExterior);
  const setInterior = useStudio((s) => s.setInterior);
  const def = vehicleById(modelId);

  return (
    <aside className="pointer-events-auto absolute right-4 bottom-4 z-20 hidden w-80 md:block">
      <div className="glass rounded-panel p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-2xs font-medium tracking-label text-subtle uppercase">
              {def.tag}
            </p>
            <h2 className="text-xl font-medium tracking-tight text-fg">{def.name}</h2>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          {def.variants.map((v) => {
            const active = v.id === variantId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={
                  "flex min-h-11 items-center justify-between rounded-chip px-3 py-2 text-left transition-colors duration-200 " +
                  (active ? "bg-fg text-bg" : "text-fg hover:bg-line/10")
                }
              >
                <span className="text-sm font-medium whitespace-nowrap">{v.name}</span>
                <span className={"ml-3 text-xs " + (active ? "text-bg/70" : "text-subtle")}>
                  {v.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-2xs font-medium tracking-label text-subtle uppercase">
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
                  (active ? "scale-110 border-fg" : "border-line/30 hover:border-line/70")
                }
                style={{ background: p.hex }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {def.exteriors.find((p) => p.id === exteriorId)?.name}
        </p>

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
                  (active ? "scale-110 border-fg" : "border-line/30 hover:border-line/70")
                }
                style={{ background: p.leather }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {def.interiors.find((p) => p.id === interiorId)?.name}
        </p>
      </div>
    </aside>
  );
}
