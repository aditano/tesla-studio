import { VEHICLES, type ModelId } from "../catalog";
import { useStudio } from "../store";

export function TopNav() {
  const modelId = useStudio((s) => s.modelId);
  const setModel = useStudio((s) => s.setModel);

  return (
    <nav
      className="pointer-events-auto glass absolute top-4 left-1/2 z-20 flex w-[min(92vw,40rem)] -translate-x-1/2 items-center justify-center gap-1 rounded-pill p-1.5"
      aria-label="Vehicle"
    >
      {VEHICLES.map((v) => {
        const active = v.id === modelId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setModel(v.id as ModelId)}
            className={
              "min-h-11 flex-1 rounded-pill px-3 py-2 text-center text-sm font-medium tracking-wide transition-colors duration-200 " +
              (active
                ? "bg-fg text-bg"
                : "text-muted hover:bg-line/10 hover:text-fg")
            }
          >
            {v.name}
          </button>
        );
      })}
    </nav>
  );
}
