import { RoundedBox } from "@react-three/drei";
import type { Interior } from "../catalog";
import { useInteriorMats } from "../materials";
function Seat({
  x,
  z,
  width = 0.48,
  leather,
}: {
  x: number;
  z: number;
  width?: number;
  leather: ReturnType<typeof useInteriorMats>["leather"];
}) {
  return (
    <group position={[x, 0.2, z]}>
      <RoundedBox
        args={[width, 0.12, 0.46]}
        radius={0.045}
        position={[0, 0.14, 0]}
        material={leather}
        castShadow
      />
      <RoundedBox
        args={[width * 0.94, 0.5, 0.12]}
        radius={0.05}
        position={[0, 0.43, 0.17]}
        rotation={[-0.13, 0, 0]}
        material={leather}
        castShadow
      />
      <RoundedBox
        args={[width * 0.6, 0.18, 0.12]}
        radius={0.045}
        position={[0, 0.74, 0.2]}
        material={leather}
      />
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[0.065, 0.2, 0.4]}
          radius={0.027}
          position={[s * width * 0.43, 0.22, 0]}
          material={leather}
        />
      ))}
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
  const mats = useInteriorMats(interior),
    cab = kind === "cab",
    truck = kind === "truck";
  return (
    <group
      position={[
        0,
        kind === "truck" ? 0.24 : kind === "crossover" ? 0.12 : 0,
        truck ? -0.22 : 0,
      ]}
    >
      <RoundedBox
        args={[width * 0.77, 0.06, 2.1]}
        radius={0.025}
        position={[0, 0.22, 0.15]}
        material={mats.plastic}
      />
      <Seat x={-0.4} z={-0.2} leather={mats.leather} />
      <Seat x={0.4} z={-0.2} leather={mats.leather} />
      {!cab && (
        <Seat x={0} z={0.78} width={width * 0.69} leather={mats.leather} />
      )}
      <RoundedBox
        args={[width * 0.78, 0.16, 0.31]}
        radius={0.055}
        position={[0, 0.83, -0.89]}
        material={mats.dash}
      />
      <RoundedBox
        args={[width * 0.78, 0.018, 0.065]}
        radius={0.007}
        position={[0, 0.84, -0.72]}
      >
        <meshStandardMaterial
          color={cab ? "#c3a371" : "#777067"}
          roughness={0.7}
        />
      </RoundedBox>
      <RoundedBox
        args={[cab ? 0.47 : 0.37, 0.245, 0.025]}
        radius={0.009}
        position={[0.05, 0.94, -0.71]}
        rotation={[-0.13, 0, 0]}
        material={mats.plastic}
      />
      <mesh position={[0.05, 0.945, -0.691]} rotation={[-0.13, 0, 0]}>
        <planeGeometry args={[cab ? 0.44 : 0.345, 0.22]} />
        <meshStandardMaterial
          color="#dbe2e6"
          emissive="#bdc8d4"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh position={[-0.027, 0.945, -0.687]} rotation={[-0.13, 0, 0]}>
        <planeGeometry args={[0.002, 0.19]} />
        <meshBasicMaterial color="#9aaab8" />
      </mesh>
      <RoundedBox
        args={[0.25, 0.19, 0.65]}
        radius={0.04}
        position={[0, 0.46, -0.12]}
        material={mats.plastic}
      />
      {!cab && (
        <group position={[-0.42, 0.91, -0.58]} rotation={[0.25, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.15, 0.017, 12, 48]} />
            <meshStandardMaterial color="#15191d" roughness={0.65} />
          </mesh>
          <RoundedBox
            args={[0.19, 0.045, 0.045]}
            radius={0.015}
            material={mats.plastic}
          />
          <RoundedBox
            args={[0.045, 0.13, 0.04]}
            radius={0.012}
            position={[0, -0.055, 0]}
            material={mats.plastic}
          />
        </group>
      )}
    </group>
  );
}
