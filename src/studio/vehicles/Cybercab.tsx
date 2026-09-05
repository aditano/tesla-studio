import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Interior, Paint, Variant } from "../catalog";
import { extrudeProfile, polyline, type Pt, type TaperFn } from "../geometry";
import { useGlassMaterial, usePaintMaterial } from "../materials";
import { BodyLift } from "../parts/BodyLift";
import { Cabin } from "../parts/Interior";
import { Hotspot } from "../parts/Hotspot";
import { WheelSet } from "../parts/Wheels";
import { useStudio } from "../store";

function cabProfile(): Pt[] {
  return polyline([
    { b: [[-2.05, 0.16], [-2.12, 0.28], [-2.1, 0.55], [-1.95, 0.82]], n: 8 },
    { b: [[-1.95, 0.82], [-1.6, 1.15], [-1.15, 1.38], [-0.55, 1.48]], n: 10 },
    { b: [[-0.55, 1.48], [0.15, 1.52], [0.85, 1.48], [1.25, 1.38]], n: 8 },
    { b: [[1.25, 1.38], [1.7, 1.18], [1.95, 0.85], [2.02, 0.5]], n: 8 },
    { b: [[2.02, 0.5], [2.04, 0.32], [1.96, 0.18], [1.82, 0.16]], n: 5 },
    [1.82, 0.16],
    [-2.05, 0.16],
  ]);
}

const cabTaper: TaperFn = (z, y) => {
  let s = 1;
  if (y > 0.9) s *= 1 - ((y - 0.9) / 0.7) * 0.22;
  if (z < -1.5) s *= 1 - ((-1.5 - z) / 0.6) * 0.28;
  if (z > 1.4) s *= 1 - ((z - 1.4) / 0.65) * 0.35;
  return Math.max(s, 0.5);
};

function Butterfly({
  side,
  open,
  paintMat,
  glassMat,
}: {
  side: 1 | -1;
  open: boolean;
  paintMat: THREE.Material;
  glassMat: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = open ? -1.15 : 0;
    ref.current.rotation.z = THREE.MathUtils.damp(ref.current.rotation.z, side * target, 5, dt);
  });
  return (
    <Hotspot id={side < 0 ? "door-fl" : "door-fr"}>
      <group ref={ref} position={[side * 0.15, 1.42, 0.05]}>
        <mesh position={[side * 0.7, -0.35, 0]} material={paintMat} castShadow>
          <boxGeometry args={[1.15, 0.08, 1.7]} />
        </mesh>
        <mesh position={[side * 0.55, -0.28, 0]} material={glassMat}>
          <boxGeometry args={[0.85, 0.05, 1.35]} />
        </mesh>
      </group>
    </Hotspot>
  );
}

export function Cybercab({
  paint,
  interior,
  variant,
}: {
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const open = useStudio((s) => s.open);
  const lightsOn = useStudio((s) => s.lightsOn);
  const lightBarOn = useStudio((s) => s.lightBarOn);
  const feature = useStudio((s) => s.feature);
  const paintMat = usePaintMaterial(paint);
  const glassMat = useGlassMaterial("#b9d4e2", 0.22);
  const body = useMemo(() => extrudeProfile(cabProfile(), 1.86, cabTaper, { bevel: 0.08, bevelSegs: 7 }), []);
  const hood = useRef<THREE.Group>(null);
  const bar = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, dt) => {
    if (hood.current) {
      const t = open.frunk || feature === "frunk" ? -0.65 : 0;
      hood.current.rotation.x = THREE.MathUtils.damp(hood.current.rotation.x, t, 5, dt);
    }
    if (bar.current) {
      const pulse = feature === "lightbar" ? 1.4 + Math.sin(clock.elapsedTime * 5.5) * 0.6 : 1;
      bar.current.emissiveIntensity = lightBarOn ? 2.8 * pulse : 0.15;
    }
  });

  const doorsOpen = open["door-fl"] || open["door-fr"] || feature === "butterfly" || feature === "doors";

  return (
    <group>
      <BodyLift>
      <mesh geometry={body} material={paintMat} castShadow receiveShadow />
      <mesh position={[0, 1.22, 0.05]} material={glassMat}>
        <boxGeometry args={[1.35, 0.55, 1.55]} />
      </mesh>
      <Cabin interior={interior} width={1.86} kind="cab" />

      <Hotspot id="frunk">
        <group ref={hood} position={[0, 0.95, -0.9]}>
          <mesh position={[0, 0.05, -0.5]} material={paintMat} castShadow>
            <boxGeometry args={[1.4, 0.06, 1.05]} />
          </mesh>
        </group>
      </Hotspot>

      <Butterfly side={-1} open={doorsOpen} paintMat={paintMat} glassMat={glassMat} />
      <Butterfly side={1} open={doorsOpen} paintMat={paintMat} glassMat={glassMat} />

      <mesh position={[0, 0.82, -2.05]}>
        <boxGeometry args={[1.35, 0.04, 0.05]} />
        <meshStandardMaterial
          ref={bar}
          color="#f4f7ff"
          emissive="#f4f7ff"
          emissiveIntensity={2.6}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[-0.62, 0.78, -2.05]}>
        <boxGeometry args={[0.2, 0.06, 0.06]} />
        <meshStandardMaterial color="#f4f7ff" emissive="#f4f7ff" emissiveIntensity={lightsOn ? 3.2 : 0.2} />
      </mesh>
      <mesh position={[0.62, 0.78, -2.05]}>
        <boxGeometry args={[0.2, 0.06, 0.06]} />
        <meshStandardMaterial color="#f4f7ff" emissive="#f4f7ff" emissiveIntensity={lightsOn ? 3.2 : 0.2} />
      </mesh>
      <mesh position={[0, 0.72, 2.02]}>
        <boxGeometry args={[1.2, 0.045, 0.04]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff1d1d" emissiveIntensity={1.6} />
      </mesh>

      {lightsOn ? (
        <>
          <spotLight position={[-0.5, 0.8, -2.2]} angle={0.3} penumbra={0.6} intensity={16} color="#eef4ff" distance={12} />
          <spotLight position={[0.5, 0.8, -2.2]} angle={0.3} penumbra={0.6} intensity={16} color="#eef4ff" distance={12} />
        </>
      ) : null}
      </BodyLift>

      <WheelSet
        style={variant.wheelStyle}
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={0.78}
        frontZ={-1.15}
        rearZ={1.2}
      />
    </group>
  );
}
