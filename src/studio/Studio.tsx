import { useEffect, useState } from "react";
import { VehicleCanvas } from "./scene/VehicleCanvas";
import { ConfigDock } from "./ui/ConfigDock";
import { Disclaimer, Hint, ResetButton, Wordmark } from "./ui/Chrome";
import { FeatureDock } from "./ui/FeatureDock";
import { MobileChrome } from "./ui/MobileChrome";
import { TopNav } from "./ui/TopNav";

function LoadingStudio() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg">
      <p className="text-sm font-medium tracking-brand text-fg">TESLA</p>
      <p className="mt-3 text-xs tracking-label text-subtle">STUDIO</p>
      <div className="mt-8 h-px w-24 overflow-hidden bg-line/20">
        <div className="h-full w-1/2 animate-pulse bg-fg/80" />
      </div>
    </div>
  );
}

export function Studio() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      {mounted ? (
        <div className="absolute inset-0">
          <VehicleCanvas />
        </div>
      ) : (
        <LoadingStudio />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <Wordmark />
        <ResetButton />
        <TopNav />
        <FeatureDock />
        <ConfigDock />
        <Hint />
        <Disclaimer />
        <MobileChrome />
      </div>
    </main>
  );
}
