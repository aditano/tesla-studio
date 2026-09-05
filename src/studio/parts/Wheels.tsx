import type { WheelStyle } from "../catalog";

type WheelProps = {
  style: WheelStyle;
  radius: number;
  caliper: string;
  x: number;
  z: number;
};

function Rim({ style, radius }: { style: WheelStyle; radius: number }) {
  const rimR = radius * 0.62;
  const spokes =
    style === "helix" ? 7 : style === "sport" ? 10 : style === "cyber" ? 6 : style === "nova" ? 10 : 8;

  if (style === "aero" || style === "photon") {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[rimR, rimR, 0.09, 48]} />
          <meshPhysicalMaterial color="#c9cdd2" metalness={0.95} roughness={0.22} />
        </mesh>
        {Array.from({ length: style === "aero" ? 4 : 12 }).map((_, i) => {
          const a = (i / (style === "aero" ? 4 : 12)) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[0, Math.sin(a) * rimR * 0.55, Math.cos(a) * rimR * 0.55]}
              rotation={[a, 0, 0]}
            >
              <boxGeometry args={[0.02, 0.018, style === "aero" ? 0.07 : 0.045]} />
              <meshStandardMaterial color="#111" metalness={0.4} roughness={0.4} />
            </mesh>
          );
        })}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.1, 24]} />
          <meshPhysicalMaterial color="#d8dce0" metalness={1} roughness={0.15} />
        </mesh>
      </group>
    );
  }

  if (style === "cyber") {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[rimR, rimR, 0.14, 6]} />
          <meshPhysicalMaterial color="#b9bdc2" metalness={1} roughness={0.3} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[rimR * 0.35, rimR * 0.35, 0.16, 6]} />
          <meshStandardMaterial color="#1a1a1c" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[rimR, rimR, 0.08, 48]} />
        <meshPhysicalMaterial color="#d0d4d8" metalness={0.95} roughness={0.18} />
      </mesh>
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2 + (style === "helix" ? 0.18 : 0);
        const len = rimR * 0.78;
        return (
          <mesh
            key={i}
            position={[0, Math.sin(a) * len * 0.42, Math.cos(a) * len * 0.42]}
            rotation={[a + (style === "helix" ? 0.35 : 0), 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.045, style === "sport" ? 0.028 : 0.038, len]} />
            <meshPhysicalMaterial color="#cfd3d8" metalness={0.96} roughness={0.16} />
          </mesh>
        );
      })}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.11, 24]} />
        <meshPhysicalMaterial color="#e8eaee" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  );
}

export function Wheel({ style, radius, caliper, x, z }: WheelProps) {
  const side = Math.sign(x) || 1;

  return (
    <group position={[x, radius, z]}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <torusGeometry args={[radius * 0.78, radius * 0.22, 16, 48]} />
        <meshStandardMaterial color="#0d0d0f" roughness={0.72} metalness={0.05} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.78, radius * 0.78, 0.2, 36]} />
        <meshStandardMaterial color="#09090b" roughness={0.45} metalness={0.4} />
      </mesh>
      <group position={[side * 0.01, 0, 0]}>
        <Rim style={style} radius={radius} />
      </group>
      <mesh position={[side * 0.07, 0, radius * 0.18]}>
        <boxGeometry args={[0.05, 0.12, 0.16]} />
        <meshStandardMaterial color={caliper} metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * 0.04, 0, 0]}>
        <cylinderGeometry args={[radius * 0.5, radius * 0.5, 0.02, 36]} />
        <meshStandardMaterial color="#6a6a70" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

export function WheelSet(props: {
  style: WheelStyle;
  radius: number;
  caliper: string;
  track: number;
  frontZ: number;
  rearZ: number;
}) {
  const { style, radius, caliper, track, frontZ, rearZ } = props;
  return (
    <group>
      <Wheel style={style} radius={radius} caliper={caliper} x={track} z={frontZ} />
      <Wheel style={style} radius={radius} caliper={caliper} x={-track} z={frontZ} />
      <Wheel style={style} radius={radius} caliper={caliper} x={track} z={rearZ} />
      <Wheel style={style} radius={radius} caliper={caliper} x={-track} z={rearZ} />
    </group>
  );
}
