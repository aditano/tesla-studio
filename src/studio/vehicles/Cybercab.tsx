import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Interior, Paint, Variant } from "../catalog";
import { usePaintMaterial, useGlassMaterial } from "../materials";
import { Cabin } from "../parts/Interior";
import { WheelSet } from "../parts/Wheels";
import { coachwork } from "./coachwork";
import { useStudio } from "../store";
export function Cybercab({
  paint,
  interior,
  variant,
}: {
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const shapes = useMemo(() => coachwork(false), []),
    body = usePaintMaterial(paint),
    glass = useGlassMaterial("#1b2531", 0.87);
  body.side = THREE.DoubleSide;
  const feature = useStudio((s) => s.demoFeature),
    open = useStudio((s) => s.open),
    lights = useStudio((s) => s.lightsOn);
  const left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    hood = useRef<THREE.Group>(null),
    bar = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(
    () => () =>
      Object.values(shapes)
        .flat()
        .forEach((g) => g.dispose()),
    [shapes],
  );
  useFrame(({ clock }, dt) => {
    for (const [ref, side] of [
      [left, -1],
      [right, 1],
    ] as const) {
      if (!ref.current) continue;
      const on =
        feature === "butterfly" || open[side < 0 ? "door-fl" : "door-fr"];
      ref.current.rotation.z = THREE.MathUtils.damp(
        ref.current.rotation.z,
        on ? -side * 1.05 : 0,
        4,
        Math.min(dt, 0.05),
      );
      ref.current.rotation.y = THREE.MathUtils.damp(
        ref.current.rotation.y,
        on ? side * 0.35 : 0,
        4,
        Math.min(dt, 0.05),
      );
    }
    if (hood.current)
      hood.current.rotation.x = THREE.MathUtils.damp(
        hood.current.rotation.x,
        feature === "frunk" || open.frunk ? -0.8 : 0,
        4,
        Math.min(dt, 0.05),
      );
    if (bar.current)
      bar.current.emissiveIntensity = lights
        ? feature === "lightbar"
          ? 2 + Math.sin(clock.elapsedTime * 3)
          : 2
        : 0;
  });
  return (
    <group>
      <group scale={[1, 1, 0.87]}>
        {shapes.shell.map((g, i) => (
          <mesh key={i} geometry={g} material={body} castShadow receiveShadow />
        ))}
        {[...shapes.roof].map((g, i) => (
          <mesh key={i} geometry={g} material={glass} />
        ))}
        {shapes.hatch.map((g, i) => (
          <mesh key={i} geometry={g} material={body} castShadow />
        ))}
        <group
          ref={hood}
          position={[0, 0.9, -0.94]}
          onClick={(e) => {
            e.stopPropagation();
            useStudio.getState().togglePart("frunk");
          }}
        >
          <group position={[0, -0.9, 0.94]}>
            {shapes.hood.map((g, i) => (
              <mesh key={i} geometry={g} material={body} castShadow />
            ))}
          </group>
        </group>
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            ref={side < 0 ? left : right}
            position={[side * 0.7, 1.15, -0.88]}
            onClick={(e) => {
              e.stopPropagation();
              useStudio.getState().togglePart(side < 0 ? "door-fl" : "door-fr");
            }}
          >
            <group position={[-side * 0.7, -1.15, 0.88]}>
              {(side < 0
                ? (["fl", "rl"] as const)
                : (["fr", "rr"] as const)
              ).map((k) =>
                shapes[k].map((g, i) => (
                  <mesh
                    key={`${k}-${i}`}
                    geometry={g}
                    material={i === 0 ? body : glass}
                    castShadow
                  />
                )),
              )}
            </group>
          </group>
        ))}
        <Cabin interior={interior} width={1.8} kind="cab" />
      </group>
      <RoundedBox
        args={[1.5, 0.035, 0.045]}
        radius={0.012}
        position={[0, 0.74, -1.99]}
      >
        <meshStandardMaterial
          ref={bar}
          color="#e8f0ff"
          emissive="#e8f0ff"
          emissiveIntensity={lights ? 2 : 0}
        />
      </RoundedBox>
      <RoundedBox
        args={[1.45, 0.035, 0.045]}
        radius={0.012}
        position={[0, 0.8, 1.99]}
      >
        <meshStandardMaterial
          color="#d91923"
          emissive="#d91923"
          emissiveIntensity={2}
        />
      </RoundedBox>
      <WheelSet
        style="aero"
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={0.875}
        frontZ={-1.296}
        rearZ={1.209}
      />
    </group>
  );
}
