import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStudio } from "../store";

function usePoolMap() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(128, 80, 8, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.35, "rgba(230,240,255,0.45)");
    grad.addColorStop(0.72, "rgba(180,200,230,0.12)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }, []);
}

function Beam({
  position,
  lookAt,
  intensity,
}: {
  position: [number, number, number];
  lookAt: [number, number, number];
  intensity: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    if (light.current && target.current) {
      light.current.target = target.current;
      light.current.target.updateMatrixWorld();
    }
    light.current?.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  }, [position, lookAt]);
  return (
    <>
      <spotLight
        ref={light}
        position={position}
        angle={0.62}
        penumbra={0.68}
        distance={22}
        intensity={intensity}
        color="#eef5ff"
        decay={1.15}
        castShadow={false}
      />
      <pointLight
        position={[position[0], position[1], position[2] - 0.12]}
        intensity={intensity * 0.08}
        distance={6}
        color="#f4f8ff"
      />
      <object3D ref={target} position={lookAt} />
    </>
  );
}

export function LampBeams({ model, on }: { model: string; on: boolean }) {
  const environment = useStudio((s) => s.environment);
  const night = environment === "midnight";
  const day = environment === "daylight";
  const intensity = on ? (night ? 1800 : day ? 220 : 720) : 0;
  const pool = usePoolMap();
  const poolOpacity = on ? (night ? 0.62 : day ? 0.16 : 0.34) : 0;
  const truck = model === "cybertruck";
  const cab = model === "cybercab";
  const x = truck ? 0.76 : cab ? 0.58 : 0.64;
  const y = truck ? 0.56 : cab ? 0.66 : 0.66;
  const z = truck ? -2.92 : cab ? -2.08 : -2.22;
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <Beam
          key={side}
          position={[side * x, y, z]}
          lookAt={[side * x * 0.35, 0.04, z - 6.2]}
          intensity={intensity}
        />
      ))}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`pool-${side}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * x * 0.45, 0.01, z - 3.4]}
          renderOrder={4}
        >
          <planeGeometry args={[2.6, 7.2]} />
          <meshBasicMaterial
            map={pool}
            color="#e8f0ff"
            transparent
            opacity={poolOpacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
