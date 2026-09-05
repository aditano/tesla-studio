import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Interior, Paint, Variant } from "../catalog";
import {
  extrudeProfile,
  greenhouse3,
  greenhouseY,
  glassTaper,
  model3Profile,
  modelYProfile,
  passengerTaper,
} from "../geometry";
import { darkTrim, useGlassMaterial, usePaintMaterial } from "../materials";
import { BodyLift } from "../parts/BodyLift";
import { Cabin } from "../parts/Interior";
import { Hotspot } from "../parts/Hotspot";
import { WheelSet } from "../parts/Wheels";
import { useStudio } from "../store";

function useDoorAngle(open: boolean, sign: number, amount = 0.95) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = open ? sign * amount : 0;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, target, 6, dt);
  });
  return ref;
}

function useHingeX(open: boolean, amount: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = open ? amount : 0;
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, target, 5.5, dt);
  });
  return ref;
}

function LightBar({
  width,
  z,
  y,
  color,
  on,
}: {
  width: number;
  z: number;
  y: number;
  color: string;
  on: boolean;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const feature = useStudio((s) => s.feature);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    const pulse = feature === "lightbar" ? 1.2 + Math.sin(clock.elapsedTime * 6) * 0.8 : 1;
    mat.current.emissiveIntensity = on ? 2.4 * pulse : 0.12;
  });
  return (
    <mesh position={[0, y, z]} castShadow>
      <boxGeometry args={[width, 0.035, 0.04]} />
      <meshStandardMaterial
        ref={mat}
        color={color}
        emissive={color}
        emissiveIntensity={on ? 2.2 : 0.12}
        roughness={0.25}
      />
    </mesh>
  );
}

function Headlamp({
  position,
  on,
  color = "#f5f8ff",
}: {
  position: [number, number, number];
  on: boolean;
  color?: string;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.22, 0.06, 0.08]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={on ? 3.2 : 0.2}
        roughness={0.2}
      />
    </mesh>
  );
}

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
  const open = useStudio((s) => s.open);
  const lightsOn = useStudio((s) => s.lightsOn);
  const lightBarOn = useStudio((s) => s.lightBarOn);
  const feature = useStudio((s) => s.feature);

  const bodyMat = usePaintMaterial(paint);
  const glassMat = useGlassMaterial(kind === "model-y" ? "#9ec0d2" : "#a9cbe0", 0.18);

  const width = kind === "model-y" ? 1.92 : 1.85;
  const frontZ = kind === "model-y" ? -1.5 : -1.49;
  const rearZ = kind === "model-y" ? 1.39 : 1.38;
  const wheelR = variant.wheelRadius;
  const bodyGeo = useMemo(() => {
    const profile = kind === "model-y" ? modelYProfile() : model3Profile();
    const inner = width * 0.34;
    return extrudeProfile(profile, width, passengerTaper(kind), {
      bevel: 0.028,
      bevelSegs: 4,
      wells: [
        { z: frontZ, y: wheelR, radius: wheelR + 0.08, inner },
        { z: rearZ, y: wheelR, radius: wheelR + 0.08, inner },
      ],
    });
  }, [kind, width, frontZ, rearZ, wheelR]);
  const glassGeo = useMemo(() => {
    const profile = kind === "model-y" ? greenhouseY() : greenhouse3();
    return extrudeProfile(profile, width, glassTaper(kind), { bevel: 0.02, bevelSegs: 3 });
  }, [kind, width]);

  useEffect(() => () => {
    bodyGeo.dispose();
    glassGeo.dispose();
  }, [bodyGeo, glassGeo]);

  const fl = useDoorAngle(open["door-fl"] || feature === "doors", -1);
  const fr = useDoorAngle(open["door-fr"] || feature === "doors", 1);
  const rl = useDoorAngle(open["door-rl"] || feature === "doors", -1, 0.85);
  const rr = useDoorAngle(open["door-rr"] || feature === "doors", 1, 0.85);
  const hood = useHingeX(open.frunk || feature === "frunk", -0.72);
  const liftgate = useHingeX(open.trunk || feature === "trunk", 1.05);
  const charge = useDoorAngle(open.charge || feature === "charge", 1, 1.4);

  const track = width * 0.455;
  const doorY = kind === "model-y" ? 0.72 : 0.62;
  const doorH = kind === "model-y" ? 0.88 : 0.78;
  const doorX = width * 0.51;
  const belt = kind === "model-y" ? 1.08 : 0.9;
  const frontBarY = kind === "model-y" ? 0.78 : 0.7;
  const frontZFace = kind === "model-y" ? -2.42 : -2.36;

  return (
    <group>
      <BodyLift lowered={variant.lowered ?? 0}>
      <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={glassGeo} material={glassMat} />

      <Cabin interior={interior} width={width} kind={kind === "model-y" ? "crossover" : "sedan"} />

      <Hotspot id="frunk">
        <group ref={hood} position={[0, belt - 0.05, -0.95]}>
          <mesh position={[0, 0.02, -0.7]} material={bodyMat} castShadow>
            <boxGeometry args={[width * 0.78, 0.05, 1.35]} />
          </mesh>
        </group>
      </Hotspot>

      <Hotspot id="trunk">
        <group ref={liftgate} position={[0, belt + 0.15, 1.15]}>
          <mesh position={[0, 0.18, 0.55]} material={bodyMat} castShadow>
            <boxGeometry args={[width * 0.72, 0.08, 1.05]} />
          </mesh>
          <mesh position={[0, 0.22, 0.42]} material={glassMat}>
            <boxGeometry args={[width * 0.55, 0.28, 0.7]} />
          </mesh>
        </group>
      </Hotspot>

      <Hotspot id="door-fl">
        <group ref={fl} position={[-doorX, 0, -0.72]}>
          <mesh position={[0.02, doorY, 0.42]} material={bodyMat} castShadow>
            <boxGeometry args={[0.07, doorH, 0.95]} />
          </mesh>
          <mesh position={[0.015, doorY + 0.28, 0.38]} material={glassMat}>
            <boxGeometry args={[0.04, 0.32, 0.72]} />
          </mesh>
        </group>
      </Hotspot>
      <Hotspot id="door-fr">
        <group ref={fr} position={[doorX, 0, -0.72]}>
          <mesh position={[-0.02, doorY, 0.42]} material={bodyMat} castShadow>
            <boxGeometry args={[0.07, doorH, 0.95]} />
          </mesh>
          <mesh position={[-0.015, doorY + 0.28, 0.38]} material={glassMat}>
            <boxGeometry args={[0.04, 0.32, 0.72]} />
          </mesh>
        </group>
      </Hotspot>
      <Hotspot id="door-rl">
        <group ref={rl} position={[-doorX, 0, 0.28]}>
          <mesh position={[0.02, doorY, 0.38]} material={bodyMat} castShadow>
            <boxGeometry args={[0.07, doorH, 0.82]} />
          </mesh>
          <mesh position={[0.015, doorY + 0.28, 0.34]} material={glassMat}>
            <boxGeometry args={[0.04, 0.32, 0.62]} />
          </mesh>
        </group>
      </Hotspot>
      <Hotspot id="door-rr">
        <group ref={rr} position={[doorX, 0, 0.28]}>
          <mesh position={[-0.02, doorY, 0.38]} material={bodyMat} castShadow>
            <boxGeometry args={[0.07, doorH, 0.82]} />
          </mesh>
          <mesh position={[-0.015, doorY + 0.28, 0.34]} material={glassMat}>
            <boxGeometry args={[0.04, 0.32, 0.62]} />
          </mesh>
        </group>
      </Hotspot>

      <Hotspot id="charge">
        <group ref={charge} position={[-width * 0.5, 0.72, 1.55]}>
          <mesh position={[-0.01, 0, 0]} material={bodyMat}>
            <boxGeometry args={[0.02, 0.16, 0.22]} />
          </mesh>
          <mesh position={[-0.02, 0, 0]}>
            <boxGeometry args={[0.01, 0.08, 0.08]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      </Hotspot>

      {kind === "model-y" ? (
        <LightBar width={width * 0.72} z={frontZFace} y={frontBarY} color="#f4f7ff" on={lightBarOn} />
      ) : null}
      <Headlamp position={[-width * 0.38, frontBarY - 0.02, frontZFace]} on={lightsOn} />
      <Headlamp position={[width * 0.38, frontBarY - 0.02, frontZFace]} on={lightsOn} />
      {lightsOn ? (
        <>
          <spotLight
            position={[-0.55, 0.72, frontZFace - 0.2]}
            angle={0.35}
            penumbra={0.6}
            intensity={18}
            color="#eef4ff"
            distance={14}
          />
          <spotLight
            position={[0.55, 0.72, frontZFace - 0.2]}
            angle={0.35}
            penumbra={0.6}
            intensity={18}
            color="#eef4ff"
            distance={14}
          />
        </>
      ) : null}

      <LightBar
        width={width * 0.78}
        z={kind === "model-y" ? 2.4 : 2.34}
        y={kind === "model-y" ? 0.92 : 0.82}
        color="#ff2a2a"
        on
      />

      <mesh position={[0, 0.08, 0]} material={darkTrim}>
        <boxGeometry args={[width * 0.62, 0.08, kind === "model-y" ? 3.6 : 3.5]} />
      </mesh>

      {variant.spoiler ? (
        <mesh position={[0, kind === "model-y" ? 1.22 : 1.02, kind === "model-y" ? 2.15 : 2.05]} material={bodyMat} castShadow>
          <boxGeometry args={[width * 0.62, 0.03, 0.22]} />
        </mesh>
      ) : null}

      <mesh position={[0, 0.48, frontZFace - 0.02]} material={darkTrim}>
        <boxGeometry args={[width * 0.55, 0.08, 0.06]} />
      </mesh>
      </BodyLift>

      <WheelSet
        style={variant.wheelStyle}
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={track}
        frontZ={frontZ}
        rearZ={rearZ}
      />
    </group>
  );
}
