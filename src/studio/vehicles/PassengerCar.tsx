import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Interior, Paint, Variant, PartId } from "../catalog";
import { usePaintMaterial, useGlassMaterial } from "../materials";
import { Cabin } from "../parts/Interior";
import { WheelSet } from "../parts/Wheels";
import { useStudio } from "../store";
import { coachwork, type Piece } from "./coachwork";

const pivots: Record<Piece, [number, number, number]> = {
  shell: [0, 0, 0],
  roof: [0, 0, 0],
  fl: [-0.86, 0, -0.9],
  fr: [0.86, 0, -0.9],
  rl: [-0.86, 0, 0.25],
  rr: [0.86, 0, 0.25],
  hood: [0, 0.91, -0.94],
  hatch: [0, 1.15, 1.15],
};
const parts: Partial<Record<Piece, PartId>> = {
  fl: "door-fl",
  fr: "door-fr",
  rl: "door-rl",
  rr: "door-rr",
  hood: "frunk",
  hatch: "trunk",
};
export function PassengerCar({
  kind,
  paint,
  interior,
  variant,
}: {
  kind: "model-3" | "model-y";
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const y = kind === "model-y",
    lift = y ? 0.14 : 0;
  const body = usePaintMaterial(paint),
    glass = useGlassMaterial("#17232d", 0.83);
  body.side = THREE.DoubleSide;
  const geometry = useMemo(() => coachwork(y), [y]);
  const refs = useRef<Partial<Record<Piece, THREE.Group>>>({});
  const feature = useStudio((s) => s.demoFeature),
    open = useStudio((s) => s.open),
    lights = useStudio((s) => s.lightsOn),
    bar = useStudio((s) => s.lightBarOn);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(
    () => () =>
      Object.values(geometry)
        .flat()
        .forEach((g) => g.dispose()),
    [geometry],
  );
  useFrame(({ clock }, dt) => {
    for (const key of Object.keys(parts) as Piece[]) {
      const ref = refs.current[key];
      if (!ref) continue;
      const door = key.length === 2;
      const on =
        open[parts[key]!] ||
        feature === (door ? "doors" : key === "hood" ? "frunk" : "trunk");
      const axis = door ? "y" : "x";
      const target = on
        ? door
          ? key.endsWith("l")
            ? -1
            : 1
          : key === "hood"
            ? -0.78
            : 1.05
        : 0;
      ref.rotation[axis] = THREE.MathUtils.damp(
        ref.rotation[axis],
        target,
        4,
        Math.min(dt, 0.05),
      );
    }
    if (glow.current)
      glow.current.emissiveIntensity = bar
        ? feature === "lightbar"
          ? 2.5 + Math.sin(clock.elapsedTime * 3) * 1.2
          : 2.5
        : 0;
  });
  return (
    <group>
      <group position={[0, -(variant.lowered ?? 0), 0]}>
        {(Object.keys(geometry) as Piece[]).map((key) => (
          <group
            key={key}
            position={pivots[key]}
            ref={(g) => {
              if (g) refs.current[key] = g;
            }}
            onClick={
              !parts[key]
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    useStudio.getState().togglePart(parts[key]!);
                  }
            }
          >
            <group
              position={pivots[key].map((v) => -v) as [number, number, number]}
            >
              {geometry[key].map((g, i) => (
                <mesh
                  key={i}
                  geometry={g}
                  material={
                    key === "roof" ||
                    (key === "hatch" && i > 0) ||
                    (key.length === 2 && i > 0)
                      ? glass
                      : body
                  }
                  castShadow
                  receiveShadow
                />
              ))}
              {key.length === 2 && (
                <RoundedBox
                  args={[0.024, 0.024, 0.16]}
                  radius={0.01}
                  position={[
                    key.endsWith("l") ? -0.925 : 0.925,
                    0.84 + lift,
                    key.startsWith("f") ? 0.08 : 0.94,
                  ]}
                >
                  <meshPhysicalMaterial
                    color="#15181d"
                    metalness={0.8}
                    roughness={0.22}
                  />
                </RoundedBox>
              )}
            </group>
          </group>
        ))}
        <Cabin
          interior={interior}
          width={1.75}
          kind={y ? "crossover" : "sedan"}
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.98, 0.98 + lift, -0.75]}
              rotation={[0, side * 0.1, 0]}
              scale={[0.16, 0.058, 0.095]}
              material={body}
              castShadow
            >
              <sphereGeometry args={[1, 24, 12]} />
            </mesh>
            <mesh
              position={[side * 1.025, 0.98 + lift, -0.69]}
              rotation={[0, 0, 0]}
              scale={[0.11, 0.035, 0.009]}
            >
              <sphereGeometry args={[1, 16, 8]} />
              <meshPhysicalMaterial
                color="#84939e"
                metalness={1}
                roughness={0.08}
              />
            </mesh>
            <Line
              points={[
                [side * 0.9, 0.94 + lift, -0.94],
                [side * 0.72, 1.35 + lift, -0.1],
                [side * 0.73, 1.36 + lift, 0.65],
                [side * 0.89, 0.95 + lift, 1.55],
              ]}
              color={paint.hex}
              lineWidth={2}
            />
            <Line
              points={[
                [side * 0.89, 0.92 + lift, 0.25],
                [side * 0.72, 1.37 + lift, 0.25],
              ]}
              color="#15181c"
              lineWidth={4}
            />
            {[-1.49, 1.39].map((z) => (
              <mesh
                key={z}
                position={[side * 0.895, 0.35, z]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <torusGeometry args={[0.408, 0.014, 8, 48, Math.PI]} />
                <meshStandardMaterial
                  color={y ? "#202328" : paint.hex}
                  roughness={0.35}
                />
              </mesh>
            ))}
            <RoundedBox
              args={[0.32, 0.035, 0.045]}
              radius={0.014}
              position={[side * 0.63, y ? 0.63 : 0.71, -2.265]}
              rotation={[0, side * 0.24, side * -0.12]}
            >
              <meshStandardMaterial
                color="#d9e9ff"
                emissive="#d9e9ff"
                emissiveIntensity={lights ? 3 : 0}
                roughness={0.1}
              />
            </RoundedBox>
            <RoundedBox
              args={[0.39, 0.05, 0.06]}
              radius={0.015}
              position={[side * 0.58, 0.79 + lift, 2.27]}
              rotation={[0, -side * 0.2, 0]}
            >
              <meshStandardMaterial
                color="#b90d1c"
                emissive="#ec1628"
                emissiveIntensity={1.5}
              />
            </RoundedBox>
          </group>
        ))}
        {y && (
          <RoundedBox
            args={[1.43, 0.026, 0.04]}
            radius={0.012}
            position={[0, 0.86, -2.27]}
          >
            <meshStandardMaterial
              ref={glow}
              color="#edf5ff"
              emissive="#edf5ff"
              emissiveIntensity={2.5}
            />
          </RoundedBox>
        )}
        <RoundedBox
          args={[1.15, 0.09, 0.04]}
          radius={0.025}
          position={[0, 0.37 + lift, -2.31]}
        >
          <meshStandardMaterial color="#101318" roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.64 + lift, -1.52]}>
          <boxGeometry args={[1.13, 0.16, 0.85]} />
          <meshStandardMaterial color="#15181b" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.66 + lift, 1.75]}>
          <boxGeometry args={[1.2, 0.13, 0.7]} />
          <meshStandardMaterial color="#16191d" roughness={0.9} />
        </mesh>
        {variant.spoiler && (
          <RoundedBox
            args={[1.4, 0.025, 0.16]}
            radius={0.009}
            position={[0, 0.93 + lift, 2.12]}
          >
            <meshPhysicalMaterial
              color="#15181d"
              clearcoat={1}
              roughness={0.3}
            />
          </RoundedBox>
        )}
        <ChargePort open={feature === "charge" || open.charge} lift={lift} />
      </group>
      <WheelSet
        style={variant.wheelStyle}
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={y ? 0.9 : 0.875}
        frontZ={-1.49}
        rearZ={1.39}
      />
    </group>
  );
}
function ChargePort({ open, lift }: { open: boolean; lift: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current)
      ref.current.rotation.y = THREE.MathUtils.damp(
        ref.current.rotation.y,
        open ? 1.4 : 0,
        5,
        Math.min(dt, 0.05),
      );
  });
  return (
    <group
      position={[-0.895, 0.84 + lift, 1.77]}
      onClick={(e) => {
        e.stopPropagation();
        useStudio.getState().togglePart("charge");
      }}
    >
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.065, 24]} />
        <meshStandardMaterial
          color="#171b20"
          emissive="#35d990"
          emissiveIntensity={open ? 0.7 : 0}
        />
      </mesh>
      <group ref={ref}>
        <mesh position={[-0.01, 0, 0.05]}>
          <boxGeometry args={[0.018, 0.15, 0.17]} />
          <meshPhysicalMaterial color="#191e25" clearcoat={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}
