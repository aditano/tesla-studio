import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useStudio } from "../store";

export function BodyLift({
  children,
  lowered = 0,
}: {
  children: ReactNode;
  lowered?: number;
}) {
  const feature = useStudio((s) => s.demoFeature);
  const ride = useStudio((s) => s.ride);
  const ref = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    let target = ride - lowered;
    if (feature === "suspension") {
      phase.current += dt * 1.35;
      target = Math.sin(phase.current) * 0.12;
    }
    ref.current.position.y = THREE.MathUtils.damp(
      ref.current.position.y,
      target,
      4.2,
      dt,
    );
  });

  return <group ref={ref}>{children}</group>;
}
