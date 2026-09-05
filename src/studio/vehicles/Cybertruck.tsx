import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Interior, Paint, Variant } from "../catalog";
import { useGlassMaterial, usePaintMaterial } from "../materials";
import { BodyLift } from "../parts/BodyLift";
import { Cabin } from "../parts/Interior";
import { Hotspot } from "../parts/Hotspot";
import { WheelSet } from "../parts/Wheels";
import { useStudio } from "../store";

function hullGeometry(): THREE.BufferGeometry {
  // Angular exoskeleton, meters. +Z rear, -Z nose.
  const w = 1.02;
  const verts: number[] = [];
  const push = (x: number, y: number, z: number) => verts.push(x, y, z);

  // Helper quad (two tris)
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    push(a[0], a[1], a[2]); push(b[0], b[1], b[2]); push(c[0], c[1], c[2]);
    push(a[0], a[1], a[2]); push(c[0], c[1], c[2]); push(d[0], d[1], d[2]);
  };

  const L = -2.82;
  const R = 2.84;
  const hoodZ = -0.85;
  const roofZ0 = -0.55;
  const roofZ1 = 0.55;
  const bedZ = 0.7;
  const yRocker = 0.42;
  const yNose = 0.95;
  const yHood = 1.28;
  const yRoof = 1.78;
  const yRail = 1.22;
  const yBed = 0.92;

  // Sides (right +X then mirrored by emitting both)
  const side = (s: number) => {
    quad([s * w, yRocker, L], [s * w, yNose, L], [s * w, yHood, hoodZ], [s * w, yRocker, hoodZ]);
    quad([s * w, yHood, hoodZ], [s * w, yRoof, roofZ0], [s * w, yRoof, roofZ1], [s * w, yRail, bedZ]);
    quad([s * w, yRocker, hoodZ], [s * w, yHood, hoodZ], [s * w, yRail, bedZ], [s * w, yRocker, bedZ]);
    quad([s * w, yRocker, bedZ], [s * w, yRail, bedZ], [s * w, yRail, R], [s * w, yRocker, R]);
    quad([s * w, yRail, bedZ], [s * w, yRoof, roofZ1], [s * (w * 0.55), yRoof, roofZ1], [s * (w * 0.55), yRail, bedZ]);
  };
  side(1);
  side(-1);

  // Front fascia
  quad([-w, yRocker, L], [w, yRocker, L], [w, yNose, L], [-w, yNose, L]);
  quad([-w, yNose, L], [w, yNose, L], [w, yHood, hoodZ], [-w, yHood, hoodZ]);
  // Hood
  quad([-w, yHood, hoodZ], [w, yHood, hoodZ], [w, yRoof, roofZ0], [-w, yRoof, roofZ0]);
  // Roof
  quad([-w * 0.7, yRoof, roofZ0], [w * 0.7, yRoof, roofZ0], [w * 0.7, yRoof, roofZ1], [-w * 0.7, yRoof, roofZ1]);
  // Rear cab
  quad([-w, yRoof, roofZ1], [w, yRoof, roofZ1], [w, yRail, bedZ], [-w, yRail, bedZ]);
  // Bed floor
  quad([-w * 0.9, yBed, bedZ], [w * 0.9, yBed, bedZ], [w * 0.9, yBed, R - 0.08], [-w * 0.9, yBed, R - 0.08]);
  // Rear
  quad([-w, yRocker, R], [-w, yRail, R], [w, yRail, R], [w, yRocker, R]);
  // Underside
  quad([-w, yRocker, L], [-w, yRocker, R], [w, yRocker, R], [w, yRocker, L]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

function Door({
  side,
  z,
  open,
  paintMat,
  glassMat,
  id,
}: {
  side: 1 | -1;
  z: number;
  open: boolean;
  paintMat: THREE.MeshPhysicalMaterial;
  glassMat: THREE.Material;
  id: "door-fl" | "door-fr" | "door-rl" | "door-rr";
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = open ? side * 0.95 : 0;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, target, 6, dt);
  });
  return (
    <Hotspot id={id}>
      <group ref={ref} position={[side * 1.02, 0, z]}>
        <mesh position={[side * 0.03, 0.95, 0.55]} material={paintMat} castShadow>
          <boxGeometry args={[0.06, 1.05, 1.15]} />
        </mesh>
        <mesh position={[side * 0.02, 1.35, 0.5]} material={glassMat}>
          <boxGeometry args={[0.04, 0.38, 0.85]} />
        </mesh>
      </group>
    </Hotspot>
  );
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
  const open = useStudio((s) => s.open);
  const lightsOn = useStudio((s) => s.lightsOn);
  const lightBarOn = useStudio((s) => s.lightBarOn);
  const feature = useStudio((s) => s.feature);
  const paintMat = usePaintMaterial(paint);
  paintMat.side = THREE.DoubleSide;
  const glassMat = useGlassMaterial("#9ec4d6", 0.22);
  const hull = useMemo(() => hullGeometry(), []);
  const hood = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const bar = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, dt) => {
    if (hood.current) {
      const t = open.frunk || feature === "frunk" ? -0.7 : 0;
      hood.current.rotation.x = THREE.MathUtils.damp(hood.current.rotation.x, t, 5, dt);
    }
    if (cover.current) {
      const t = open.tonneau || feature === "tonneau" || open.trunk || feature === "trunk" ? 1.15 : 0;
      cover.current.position.z = THREE.MathUtils.damp(cover.current.position.z, t, 4, dt);
    }
    if (bar.current) {
      const pulse = feature === "lightbar" ? 1.3 + Math.sin(clock.elapsedTime * 7) * 0.7 : 1;
      bar.current.emissiveIntensity = lightBarOn ? 2.6 * pulse : 0.15;
    }
  });

  const doorsOpen = feature === "doors";

  return (
    <group>
      <BodyLift>
      <mesh geometry={hull} material={paintMat} castShadow receiveShadow />
      <Cabin interior={interior} width={2.0} kind="truck" />

      {/* windshield */}
      <mesh position={[0, 1.52, -0.7]} rotation={[0.72, 0, 0]} material={glassMat}>
        <planeGeometry args={[1.7, 0.7]} />
      </mesh>
      <mesh position={[0, 1.55, 0.05]} material={glassMat}>
        <boxGeometry args={[1.35, 0.05, 1.0]} />
      </mesh>

      <Hotspot id="frunk">
        <group ref={hood} position={[0, 1.28, -0.85]}>
          <mesh position={[0, 0.02, -0.9]} material={paintMat} castShadow>
            <boxGeometry args={[2.0, 0.05, 1.85]} />
          </mesh>
        </group>
      </Hotspot>

      <Hotspot id="tonneau">
        <group ref={cover} position={[0, 1.24, 0.7]}>
          <mesh position={[0, 0, 1.0]} material={paintMat} castShadow>
            <boxGeometry args={[1.85, 0.04, 2.0]} />
          </mesh>
        </group>
      </Hotspot>

      <Door side={-1} z={-0.7} open={open["door-fl"] || doorsOpen} paintMat={paintMat} glassMat={glassMat} id="door-fl" />
      <Door side={1} z={-0.7} open={open["door-fr"] || doorsOpen} paintMat={paintMat} glassMat={glassMat} id="door-fr" />
      <Door side={-1} z={0.45} open={open["door-rl"] || doorsOpen} paintMat={paintMat} glassMat={glassMat} id="door-rl" />
      <Door side={1} z={0.45} open={open["door-rr"] || doorsOpen} paintMat={paintMat} glassMat={glassMat} id="door-rr" />

      <mesh position={[0, 1.42, -0.62]}>
        <boxGeometry args={[1.95, 0.045, 0.05]} />
        <meshStandardMaterial
          ref={bar}
          color="#f4f7ff"
          emissive="#f4f7ff"
          emissiveIntensity={2.4}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[-0.72, 0.92, -2.82]}>
        <boxGeometry args={[0.28, 0.08, 0.06]} />
        <meshStandardMaterial color="#f4f7ff" emissive="#f4f7ff" emissiveIntensity={lightsOn ? 3 : 0.2} />
      </mesh>
      <mesh position={[0.72, 0.92, -2.82]}>
        <boxGeometry args={[0.28, 0.08, 0.06]} />
        <meshStandardMaterial color="#f4f7ff" emissive="#f4f7ff" emissiveIntensity={lightsOn ? 3 : 0.2} />
      </mesh>
      <mesh position={[0, 0.95, 2.84]}>
        <boxGeometry args={[1.7, 0.06, 0.04]} />
        <meshStandardMaterial color="#ff2a2a" emissive="#ff1d1d" emissiveIntensity={1.8} />
      </mesh>

      {lightsOn ? (
        <>
          <spotLight position={[-0.7, 0.95, -3]} angle={0.32} penumbra={0.55} intensity={22} color="#eef4ff" distance={16} />
          <spotLight position={[0.7, 0.95, -3]} angle={0.32} penumbra={0.55} intensity={22} color="#eef4ff" distance={16} />
        </>
      ) : null}
      </BodyLift>

      <WheelSet
        style={variant.wheelStyle}
        radius={variant.wheelRadius}
        caliper={variant.caliper}
        track={0.92}
        frontZ={-1.7}
        rearZ={1.9}
      />
    </group>
  );
}
