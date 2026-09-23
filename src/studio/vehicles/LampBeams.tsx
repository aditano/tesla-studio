import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { backdropById } from "../scene/backdrops";
import { useStudio } from "../store";

type Chip = {
  position: [number, number, number];
  size: [number, number];
  /** Yaw so the element sits on a curved fascia instead of a flat slab. */
  yaw?: number;
  bar?: boolean;
  round?: boolean;
};

type Rig = {
  /** Most-forward body station. The pool starts here and runs down the road. */
  noseZ: number;
  spots: [number, number, number][];
  chips: Chip[];
};

function curvedLamp(
  side: number,
  samples: { t: number; x: number; y: number; z: number }[],
  size: [number, number],
): Chip[] {
  return samples.map((sample, index) => {
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const yaw = Math.atan2(next.z - sample.z, next.x - sample.x);
    return {
      position: [side * sample.x, sample.y, sample.z],
      size,
      yaw: side < 0 ? Math.PI - yaw : yaw,
    };
  });
}

/** Highland lamps are separate curved openings. Juniper's export is a stack of
 * fascia-deep blocks, so only a thin blade and the outer projectors are drawn. */
const highlandSamples = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const t = i / 6;
  return {
    t,
    x: 0.46 + t * 0.36,
    y: 0.662 - t * 0.028,
    z: -2.205 + t * t * 0.145,
  };
});

function juniperBar(): Chip[] {
  const chips: Chip[] = [];
  const count = 26;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = THREE.MathUtils.lerp(-0.8, 0.8, t);
    const arch = 1 - Math.abs(t - 0.5) * 2;
    chips.push({
      position: [x, 0.808 + arch * 0.012, -2.332],
      size: [0.046, 0.016],
      bar: true,
    });
  }
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      chips.push({
        position: [side * (0.62 + t * 0.2), 0.642, -2.272 + t * 0.02],
        size: [0.04, 0.026],
        yaw: side * t * 0.22,
      });
    }
    chips.push({
      position: [side * 0.7, 0.628, -2.268],
      size: [0.07, 0.04],
      round: true,
    });
  }
  return chips;
}

const RIGS: Record<string, Rig> = {
  "model-3": {
    noseZ: -2.36,
    spots: [
      [-0.62, 0.64, -2.16],
      [0.62, 0.64, -2.16],
    ],
    chips: [
      ...curvedLamp(-1, highlandSamples, [0.04, 0.015]),
      ...curvedLamp(1, highlandSamples, [0.04, 0.015]),
      { position: [-0.5, 0.628, -2.2], size: [0.055, 0.04], round: true },
      { position: [0.5, 0.628, -2.2], size: [0.055, 0.04], round: true },
    ],
  },
  "model-y": {
    noseZ: -2.4,
    spots: [
      [-0.72, 0.64, -2.26],
      [0.72, 0.64, -2.26],
    ],
    chips: juniperBar(),
  },
  "model-3-heritage": {
    noseZ: -2.34,
    spots: [
      [-0.62, 0.64, -2.3],
      [0.62, 0.64, -2.3],
    ],
    chips: [],
  },
  "model-s-heritage": {
    noseZ: -2.48,
    spots: [
      [-0.72, 0.66, -2.42],
      [0.72, 0.66, -2.42],
    ],
    chips: [],
  },
  cybertruck: {
    noseZ: -2.84,
    spots: [
      [-0.55, 0.99, -2.86],
      [0.55, 0.99, -2.86],
    ],
    chips: [],
  },
  cybercab: {
    noseZ: -2.06,
    spots: [
      [-0.42, 0.64, -2.04],
      [0.42, 0.64, -2.04],
    ],
    chips: [],
  },
};

function usePoolMap() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      const v = y / (size - 1);
      const along = Math.exp(-v * 3.1) * (1 - v);
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const across = Math.cos((u - 0.5) * Math.PI) ** 1.35;
        const alpha = Math.max(0, Math.min(1, along * across));
        const i = (y * size + x) * 4;
        image.data[i] = 232;
        image.data[i + 1] = 240;
        image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.NoColorSpace;
    map.flipY = false;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function Spot({
  position,
  noseZ,
  intensity,
}: {
  position: [number, number, number];
  noseZ: number;
  intensity: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const aim: [number, number, number] = [
    position[0] * 0.2,
    0.02,
    noseZ - 8.5,
  ];
  useFrame(() => {
    const spot = light.current;
    const marker = target.current;
    if (!spot || !marker) return;
    spot.target = marker;
    marker.updateWorldMatrix(true, false);
  });
  return (
    <>
      <spotLight
        ref={light}
        position={position}
        angle={0.26}
        penumbra={1}
        distance={12}
        decay={2}
        intensity={intensity}
        color="#e7eef8"
        castShadow={false}
      />
      <object3D ref={target} position={aim} />
    </>
  );
}

function Pool({
  noseZ,
  opacity,
  map,
}: {
  noseZ: number;
  opacity: number;
  map: THREE.Texture;
}) {
  const geometry = useMemo(() => {
    const length = 5.2;
    const near = noseZ - 0.04;
    const far = near - length;
    const w0 = 0.42;
    const w1 = 1.15;
    const y = 0.006;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [-w0, y, near, w0, y, near, -w1, y, far, w1, y, far],
        3,
      ),
    );
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2),
    );
    geo.setIndex([0, 2, 1, 1, 2, 3]);
    return geo;
  }, [noseZ]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (opacity <= 0) return null;
  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshBasicMaterial
        map={map}
        color="#d5e2f4"
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped
      />
    </mesh>
  );
}

function ChipFace({ chip, lit }: { chip: Chip; lit: boolean }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const pulse = useStudio((s) => s.demoFeature === "lightbar" && !!chip.bar);
  useFrame(({ clock }) => {
    const material = glow.current;
    if (!material) return;
    const base = lit ? (chip.bar ? 1.35 : 1.7) : 0;
    material.emissiveIntensity = pulse
      ? base + Math.sin(clock.elapsedTime * 3) * 0.45
      : base;
  });
  if (!lit) return null;
  const yaw = (chip.yaw ?? 0) + Math.PI;
  return (
    <mesh position={chip.position} rotation={[0, yaw, 0]}>
      {chip.round ? (
        <circleGeometry args={[chip.size[0] * 0.5, 18]} />
      ) : (
        <planeGeometry args={chip.size} />
      )}
      <meshStandardMaterial
        ref={glow}
        color="#f7fbff"
        emissive="#f4f8ff"
        emissiveIntensity={lit ? 1.55 : 0}
        roughness={0.42}
        metalness={0}
        toneMapped
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

export function LampBeams({ model, on }: { model: string; on: boolean }) {
  const environment = useStudio((s) => s.environment);
  const lightBar = useStudio((s) => s.lightBarOn);
  const backdrop = backdropById(environment);
  const pool = usePoolMap();
  const rig = RIGS[model] ?? RIGS["model-3"];
  return (
    <group>
      {rig.chips.map((chip, index) => (
        <ChipFace
          key={`${chip.position.join(",")}-${index}`}
          chip={chip}
          lit={chip.bar ? on && lightBar : on}
        />
      ))}
      {rig.spots.map((position, index) => (
        <Spot
          key={`spot-${index}`}
          position={position}
          noseZ={rig.noseZ}
          intensity={on ? backdrop.beam : 0}
        />
      ))}
      <Pool noseZ={rig.noseZ} opacity={on ? backdrop.pool : 0} map={pool} />
    </group>
  );
}
