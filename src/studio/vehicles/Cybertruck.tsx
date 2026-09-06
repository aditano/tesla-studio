import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Interior, Paint, Variant } from "../catalog";
import { usePaintMaterial, useGlassMaterial } from "../materials";
import { BodyLift } from "../parts/BodyLift";
import { Cabin } from "../parts/Interior";
import { WheelSet } from "../parts/Wheels";
import { useStudio } from "../store";

function panel(points: [number, number, number][]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  const indices = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function sidePanel(side: number, start: number, end: number) {
  const points: THREE.Vector2[] = [];
  const top = (z: number) =>
    z < -1.25 ? THREE.MathUtils.lerp(0.98, 1.27, (z + 2.85) / 1.6) : 1.27;
  points.push(
    new THREE.Vector2(start, top(start)),
    new THREE.Vector2(end, top(end)),
  );
  for (let i = 0; i <= 80; i++) {
    const z = THREE.MathUtils.lerp(end, start, i / 80);
    let y = 0.43;
    for (const axle of [-1.8, 1.75]) {
      const dz = z - axle;
      if (Math.abs(dz) < 0.51)
        y = Math.max(y, 0.445 + Math.sqrt(0.51 ** 2 - dz ** 2));
    }
    points.push(new THREE.Vector2(z, y));
  }
  const shape = new THREE.Shape(points),
    g = new THREE.ShapeGeometry(shape);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getX(i),
      y = p.getY(i);
    p.setXYZ(i, side * 1.025, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function useTruckGeometry() {
  return useMemo(() => {
    const nose = -2.85,
      hood = -1.25,
      apex = -0.05;
    return {
      front: panel([
        [-1.025, 0.43, nose],
        [1.025, 0.43, nose],
        [1.025, 0.98, nose],
        [-1.025, 0.98, nose],
      ]),
      hood: panel([
        [-1.025, 0.98, nose],
        [1.025, 0.98, nose],
        [1.025, 1.27, hood],
        [-1.025, 1.27, hood],
      ]),
      windshield: panel([
        [-0.98, 1.29, hood],
        [0.98, 1.29, hood],
        [0.76, 1.9, apex],
        [-0.76, 1.9, apex],
      ]),
      roof: panel([
        [-0.76, 1.9, apex],
        [0.76, 1.9, apex],
        [0.82, 1.73, 0.85],
        [-0.82, 1.73, 0.85],
      ]),
      back: panel([
        [-0.82, 1.73, 0.85],
        [0.82, 1.73, 0.85],
        [0.92, 1.27, 1.3],
        [-0.92, 1.27, 1.3],
      ]),
      sides: [-1, 1].map((s) => ({
        fixed: [sidePanel(s, -2.85, -1.05), sidePanel(s, 1.15, 2.85)],
        front: sidePanel(s, -1.05, 0.1),
        rear: sidePanel(s, 0.1, 1.15),
        glassFront: panel([
          [s * 1.01, 1.29, -1.05],
          [s * 0.78, 1.87, -0.05],
          [s * 0.785, 1.84, 0.08],
          [s * 1.01, 1.29, 0.08],
        ]),
        glassRear: panel([
          [s * 1.01, 1.29, 0.12],
          [s * 0.785, 1.84, 0.12],
          [s * 0.9, 1.5, 1.13],
          [s * 1.01, 1.29, 1.13],
        ]),
        rail: panel([
          [s * 1.025, 1.27, 1.15],
          [s * 0.9, 1.51, 1.15],
          [s * 1.025, 1.27, 2.85],
        ]),
      })),
    };
  }, []);
}
export function Cybertruck({
  paint,
  interior,
  variant,
}: {
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const g = useTruckGeometry(),
    body = usePaintMaterial(paint),
    glass = useGlassMaterial("#17232b", 0.9);
  body.side = THREE.DoubleSide;
  const feature = useStudio((s) => s.demoFeature),
    open = useStudio((s) => s.open),
    lights = useStudio((s) => s.lightsOn),
    lightBar = useStudio((s) => s.lightBarOn);
  const hood = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    cover = useRef<THREE.Group>(null),
    bar = useRef<THREE.MeshStandardMaterial>(null);
  const doors = useRef<(THREE.Group | null)[]>([]);
  useEffect(
    () => () => {
      for (const v of Object.values(g)) {
        if (v instanceof THREE.BufferGeometry) v.dispose();
      }
      g.sides.forEach((s) => {
        s.fixed.forEach((v) => v.dispose());
        s.front.dispose();
        s.rear.dispose();
        s.glassFront.dispose();
        s.glassRear.dispose();
        s.rail.dispose();
      });
    },
    [g],
  );
  useFrame(({ clock }, dt) => {
    const damp = (a: number, b: number) =>
      THREE.MathUtils.damp(a, b, 4, Math.min(dt, 0.05));
    if (hood.current)
      hood.current.rotation.x = damp(
        hood.current.rotation.x,
        feature === "frunk" || open.frunk ? -0.8 : 0,
      );
    if (tail.current)
      tail.current.rotation.x = damp(
        tail.current.rotation.x,
        feature === "trunk" || open.trunk ? Math.PI / 2 : 0,
      );
    if (cover.current) {
      const t =
        feature === "tonneau" ||
        feature === "trunk" ||
        open.tonneau ||
        open.trunk
          ? 0.04
          : 1;
      cover.current.scale.z = damp(cover.current.scale.z, t);
    }
    doors.current.forEach((d, i) => {
      if (!d) return;
      const id = (["door-fl", "door-rl", "door-fr", "door-rr"] as const)[i];
      d.rotation.y = damp(
        d.rotation.y,
        open[id] || feature === "doors" ? (i < 2 ? -1 : 1) : 0,
      );
    });
    if (bar.current)
      bar.current.emissiveIntensity = lightBar
        ? feature === "lightbar"
          ? 2.6 + Math.sin(clock.elapsedTime * 3)
          : 2.6
        : 0;
  });
  return (
    <group>
      <BodyLift>
        <mesh geometry={g.front} material={body} castShadow />
        <group
          ref={hood}
          position={[0, 1.27, -1.25]}
          onClick={(e) => {
            e.stopPropagation();
            useStudio.getState().togglePart("frunk");
          }}
        >
          <mesh
            position={[0, -1.27, 1.25]}
            geometry={g.hood}
            material={body}
            castShadow
          />
        </group>
        <mesh geometry={g.windshield} material={glass} />
        <mesh geometry={g.roof} material={glass} />
        <mesh geometry={g.back} material={glass} />
        {g.sides.map((sg, index) => {
          const s = index === 0 ? -1 : 1;
          return (
            <group key={s}>
              {sg.fixed.map((geo, i) => (
                <mesh key={i} geometry={geo} material={body} castShadow />
              ))}
              <mesh geometry={sg.rail} material={body} castShadow />
              {[0, 1].map((i) => (
                <group
                  key={i}
                  ref={(d) => {
                    doors.current[index * 2 + i] = d;
                  }}
                  position={[s * 1.025, 0, i === 0 ? -1.05 : 0.1]}
                  onClick={(e) => {
                    e.stopPropagation();
                    useStudio
                      .getState()
                      .togglePart(
                        (["door-fl", "door-rl", "door-fr", "door-rr"] as const)[
                          index * 2 + i
                        ],
                      );
                  }}
                >
                  <group position={[-s * 1.025, 0, i === 0 ? 1.05 : -0.1]}>
                    <mesh
                      geometry={i === 0 ? sg.front : sg.rear}
                      material={body}
                      castShadow
                    />
                    <mesh
                      geometry={i === 0 ? sg.glassFront : sg.glassRear}
                      material={glass}
                    />
                  </group>
                </group>
              ))}
              <Line
                points={[
                  [s * 1.03, 1.29, -1.2],
                  [s * 0.78, 1.91, -0.05],
                  [s * 1.03, 1.3, 2.85],
                ]}
                color={paint.hex}
                lineWidth={3}
              />
              <RoundedBox
                args={[0.15, 0.09, 0.24]}
                radius={0.015}
                position={[s * 1.13, 1.25, -0.88]}
                material={body}
                castShadow
              />
              <RoundedBox
                args={[0.055, 0.09, 2.35]}
                radius={0.014}
                position={[s * 1.03, 0.43, 0.04]}
              >
                <meshStandardMaterial color="#1a1e22" roughness={0.75} />
              </RoundedBox>
            </group>
          );
        })}
        <Cabin interior={interior} width={2} kind="truck" />
        <RoundedBox
          args={[1.75, 0.13, 0.96]}
          radius={0.04}
          position={[0, 0.83, -2.01]}
        >
          <meshStandardMaterial color="#171b20" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.78, 2]}>
          <boxGeometry args={[1.84, 0.09, 1.62]} />
          <meshStandardMaterial color="#24292f" roughness={0.85} />
        </mesh>
        <group
          ref={cover}
          position={[0, 1.29, 1.14]}
          onClick={(e) => {
            e.stopPropagation();
            useStudio.getState().togglePart("tonneau");
          }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <mesh key={i} position={[0, 0, 0.035 + i * 0.069]} castShadow>
              <boxGeometry args={[1.84, 0.033, 0.064]} />
              <meshPhysicalMaterial
                color="#373d43"
                metalness={0.65}
                roughness={0.4}
              />
            </mesh>
          ))}
        </group>
        <group
          ref={tail}
          position={[0, 0.78, 2.85]}
          onClick={(e) => {
            e.stopPropagation();
            useStudio.getState().togglePart("trunk");
          }}
        >
          <mesh position={[0, 0.23, 0]} material={body} castShadow>
            <boxGeometry args={[2.05, 0.46, 0.045]} />
          </mesh>
          <mesh position={[0, 0.45, 0.026]}>
            <boxGeometry args={[1.84, 0.03, 0.025]} />
            <meshStandardMaterial
              color="#d91424"
              emissive="#d91424"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
        <mesh position={[0, 0.99, -2.865]}>
          <boxGeometry args={[1.98, 0.034, 0.03]} />
          <meshStandardMaterial
            ref={bar}
            color="#e5edff"
            emissive="#e5edff"
            emissiveIntensity={2.6}
          />
        </mesh>
        {[-1, 1].map((s) => (
          <RoundedBox
            key={s}
            args={[0.3, 0.055, 0.035]}
            radius={0.015}
            position={[s * 0.75, 0.59, -2.877]}
          >
            <meshStandardMaterial
              color="#e8efff"
              emissive="#e8efff"
              emissiveIntensity={lights ? 3 : 0}
            />
          </RoundedBox>
        ))}
        <RoundedBox
          args={[2.12, 0.16, 0.1]}
          radius={0.025}
          position={[0, 0.47, -2.85]}
        >
          <meshStandardMaterial color="#20252b" roughness={0.65} />
        </RoundedBox>
      </BodyLift>
      <WheelSet
        style="cyber"
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={1}
        frontZ={-1.8}
        rearZ={1.75}
      />
    </group>
  );
}
