import type { WheelStyle } from "../catalog";
function Wheel({
  style,
  radius,
  caliper,
  x,
  z,
}: {
  style: WheelStyle;
  radius: number;
  caliper: string;
  x: number;
  z: number;
}) {
  const side = Math.sign(x),
    rim = radius * (style === "sport" || style === "helix" ? 0.76 : 0.7),
    aero = style === "aero" || style === "photon",
    n = style === "cyber" ? 7 : style === "helix" ? 7 : aero ? 5 : 10;
  return (
    <group position={[x, radius, z]}>
      <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[radius * 0.83, radius * 0.17, 20, 64]} />
        <meshStandardMaterial color="#171a1e" roughness={0.87} />
      </mesh>
      {[-0.075, 0.075].map((offset) => (
        <mesh
          key={offset}
          position={[offset, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[radius * 0.83, radius * 0.065, 12, 64]} />
          <meshStandardMaterial color="#121519" roughness={0.9} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[rim * 0.88, rim * 0.88, 0.12, 64]} />
        <meshStandardMaterial
          color="#181b20"
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * 0.085, 0, 0]}>
        <cylinderGeometry args={[rim * 0.83, rim * 0.83, 0.016, 64]} />
        <meshStandardMaterial
          color="#72777c"
          metalness={0.86}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[side * 0.096, 0, -rim * 0.68]}>
        <boxGeometry args={[0.035, 0.14, 0.065]} />
        <meshPhysicalMaterial
          color={caliper}
          metalness={0.3}
          roughness={0.32}
        />
      </mesh>
      <group position={[side * 0.115, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[rim, 0.012, 10, 64]} />
          <meshPhysicalMaterial
            color="#8c949d"
            metalness={1}
            roughness={0.22}
          />
        </mesh>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          return (
            <group key={i} rotation={[a, 0, 0]}>
              <mesh
                position={[0, 0, rim * 0.52]}
                rotation={[style === "helix" ? 0.25 : 0, 0, 0]}
                castShadow
              >
                <boxGeometry args={[0.025, aero ? 0.092 : 0.025, rim * 0.92]} />
                <meshPhysicalMaterial
                  color={aero ? "#444b55" : "#a0a8b0"}
                  metalness={0.92}
                  roughness={0.25}
                />
              </mesh>
              {!aero && (
                <mesh
                  position={[side * 0.003, 0.026, rim * 0.58]}
                  rotation={[0.15, 0, 0]}
                >
                  <boxGeometry args={[0.02, 0.014, rim * 0.8]} />
                  <meshPhysicalMaterial
                    color="#5b636d"
                    metalness={1}
                    roughness={0.23}
                  />
                </mesh>
              )}
            </group>
          );
        })}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 0.04, 32]} />
          <meshPhysicalMaterial
            color="#30363e"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[
                side * 0.024,
                Math.sin(a) * 0.035,
                Math.cos(a) * 0.035,
              ]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.005, 6]} />
              <meshStandardMaterial
                color="#a4acb5"
                metalness={1}
                roughness={0.3}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
export function WheelSet({
  style,
  radius,
  caliper,
  track,
  frontZ,
  rearZ,
}: {
  style: WheelStyle;
  radius: number;
  caliper: string;
  track: number;
  frontZ: number;
  rearZ: number;
}) {
  return (
    <group>
      {[-track, track].flatMap((x) =>
        [frontZ, rearZ].map((z) => (
          <Wheel
            key={`${x}-${z}`}
            x={x}
            z={z}
            style={style}
            radius={radius}
            caliper={caliper}
          />
        )),
      )}
    </group>
  );
}
