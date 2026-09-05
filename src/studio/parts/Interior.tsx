import type { Interior } from "../catalog";
import { useInteriorMats } from "../materials";

function Seat({
  position,
  rotation = [0, 0, 0],
  wide = 0.48,
  leather,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  wide?: number;
  leather: ReturnType<typeof useInteriorMats>["leather"];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.18, 0]} material={leather} castShadow>
        <boxGeometry args={[wide, 0.12, 0.46]} />
      </mesh>
      <mesh position={[0, 0.42, 0.18]} material={leather} castShadow>
        <boxGeometry args={[wide, 0.52, 0.1]} />
      </mesh>
      <mesh position={[-wide * 0.42, 0.32, 0]} material={leather}>
        <boxGeometry args={[0.08, 0.22, 0.4]} />
      </mesh>
      <mesh position={[wide * 0.42, 0.32, 0]} material={leather}>
        <boxGeometry args={[0.08, 0.22, 0.4]} />
      </mesh>
    </group>
  );
}

export function Cabin({
  interior,
  width,
  kind,
}: {
  interior: Interior;
  width: number;
  kind: "sedan" | "crossover" | "truck" | "cab";
}) {
  const mats = useInteriorMats(interior);
  const cabinZ = kind === "truck" ? -0.35 : kind === "cab" ? 0.05 : 0.15;
  const floorW = width * 0.72;
  const floorL = kind === "cab" ? 1.6 : 2.2;
  const hasRear = kind !== "cab";
  const hasWheel = kind !== "cab";

  return (
    <group position={[0, 0.15, cabinZ]}>
      <mesh position={[0, 0.02, 0]} material={mats.dash} receiveShadow>
        <boxGeometry args={[floorW, 0.04, floorL]} />
      </mesh>
      <Seat position={[-floorW * 0.22, 0.08, kind === "cab" ? 0.05 : -0.35]} leather={mats.leather} />
      <Seat position={[floorW * 0.22, 0.08, kind === "cab" ? 0.05 : -0.35]} leather={mats.leather} />
      {hasRear ? (
        <Seat
          position={[0, 0.08, 0.55]}
          wide={floorW * 0.72}
          leather={mats.leather}
        />
      ) : null}
      <mesh
        position={[0, 0.42, kind === "cab" ? -0.55 : -0.95]}
        material={mats.dash}
        castShadow
      >
        <boxGeometry args={[floorW * 0.92, 0.28, 0.28]} />
      </mesh>
      <mesh
        position={[0.12, 0.52, kind === "cab" ? -0.42 : -0.82]}
        rotation={[-0.35, 0, 0]}
      >
        <planeGeometry args={[kind === "truck" ? 0.48 : 0.38, 0.24]} />
        <meshStandardMaterial
          color="#0b1220"
          emissive="#7eb6ff"
          emissiveIntensity={0.45}
          roughness={0.2}
        />
      </mesh>
      {hasWheel ? (
        <group position={[0.32, 0.55, kind === "truck" ? -0.72 : -0.78]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.018, 8, 24]} />
            <meshStandardMaterial color="#1a1a1c" roughness={0.5} />
          </mesh>
        </group>
      ) : null}
      <mesh position={[0, 0.28, kind === "cab" ? 0.1 : -0.15]} material={mats.plastic}>
        <boxGeometry args={[0.32, 0.22, 0.7]} />
      </mesh>
      <mesh position={[0, 0.72, 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, floorW * 0.8, 8]} />
        <meshStandardMaterial color="#cfe8ff" emissive="#9fd2ff" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
