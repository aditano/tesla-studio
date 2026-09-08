import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  Html,
  useProgress,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  Vignette,
} from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useStudio } from "../store";
import { ActiveVehicle } from "../vehicles/ActiveVehicle";

import { shotFor } from "./shots";

function CinematicControls() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const feature = useStudio((s) => s.feature);
  const revision = useStudio((s) => s.cameraRevision);
  const model = useStudio((s) => s.modelId);
  const autoRotate = useStudio((s) => s.autoRotate);
  const flight = useRef<{
    start: THREE.Vector3;
    from: THREE.Vector3;
    end: THREE.Vector3;
    target: THREE.Vector3;
    elapsed: number;
    duration: number;
  } | null>(null);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width < 768 ? 42 : 32;
    cam.updateProjectionMatrix();
    const shot = shotFor(model, feature ?? "overview");
    const target = new THREE.Vector3(...shot.target);
    const end = new THREE.Vector3(...shot.position);
    if (feature !== "interior") {
      const span =
        model === "cybertruck" ? 1.18 : model === "cybercab" ? 0.9 : 1;
      end
        .sub(target)
        .multiplyScalar(span * (size.width < 768 ? 1.28 : 1))
        .add(target);
      end.y = Math.max(end.y, 0.62);
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    flight.current = {
      start: camera.position.clone(),
      from: controls.current?.target.clone() ?? new THREE.Vector3(0, 0.75, 0),
      end,
      target,
      elapsed: 0,
      duration: reduced ? 0 : 1.65,
    };
  }, [feature, revision, model, camera, size.width]);
  useFrame((_, delta) => {
    const f = flight.current,
      c = controls.current;
    if (!f || !c) return;
    f.elapsed += Math.min(delta, 0.05);
    const t = f.duration === 0 ? 1 : Math.min(1, f.elapsed / f.duration);
    const e = t * t * t * (t * (t * 6 - 15) + 10);
    camera.position.lerpVectors(f.start, f.end, e);
    if (feature !== "interior") {
      camera.position.y = Math.max(camera.position.y, 0.45);
    }
    c.target.lerpVectors(f.from, f.target, e);
    c.update();
    if (t === 1) flight.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate && !feature}
      autoRotateSpeed={0.45}
      minDistance={feature === "interior" ? 0.25 : 3.8}
      maxDistance={18}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
      onStart={() => {
        flight.current = null;
        useStudio.getState().setAutoRotate(false);
        window.dispatchEvent(new Event("studio-manual-orbit"));
      }}
    />
  );
}

function atmosphere(mode: string) {
  const day = mode === "daylight",
    night = mode === "midnight";
  return {
    day,
    night,
    bg: day ? "#8e969e" : night ? "#06080c" : "#15191f",
    floor: day ? "#8e969e" : night ? "#06080c" : "#15191f",
    fogNear: day ? 16 : night ? 10 : 12,
    fogFar: day ? 52 : night ? 38 : 44,
  };
}

function ToneMap() {
  const mode = useStudio((s) => s.environment);
  const gl = useThree((s) => s.gl);
  const exposure =
    mode === "daylight" ? 0.94 : mode === "midnight" ? 0.8 : 0.97;
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl, exposure]);
  return null;
}

function Lighting({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
  const { day, night, bg, fogNear, fogFar } = atmosphere(mode);
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, fogNear, fogFar]} />
      <hemisphereLight
        intensity={day ? 0.58 : night ? 0.18 : 0.3}
        color={day ? "#f3f6fa" : night ? "#9aadc4" : "#e6eef6"}
        groundColor={day ? "#6a7076" : night ? "#0a0c10" : "#2a2e33"}
      />
      <directionalLight
        position={[-4.4, 10.2, -3.8]}
        intensity={day ? 1.05 : night ? 0.26 : 0.62}
        color={day ? "#fff4e4" : night ? "#c5d2e6" : "#f5f7fb"}
        castShadow
        shadow-mapSize={[high ? 2048 : 1024, high ? 2048 : 1024]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.03}
        shadow-radius={3}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-8.5}
        shadow-camera-right={8.5}
        shadow-camera-top={8.5}
        shadow-camera-bottom={-8.5}
      />
      <directionalLight
        position={[5.6, 5.2, 2.8]}
        intensity={day ? 0.28 : night ? 0.1 : 0.18}
        color={night ? "#8aa0c4" : "#fff6ec"}
      />
      <Environment resolution={high ? 1024 : 256} frames={1} key={mode}>
        <Lightformer
          form="rect"
          intensity={day ? 2.4 : night ? 1.15 : 2.6}
          position={[0, 9.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={day ? [28, 20, 1] : [22, 16, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.2 : night ? 1.8 : 2.7}
          position={[0, 8.6, -0.4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[20, day ? 2.4 : 0.7, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 0.7 : night ? 1.1 : 1.5}
          position={[0, 8.5, 1.6]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[16, day ? 1.6 : 0.45, 1]}
          color="#f4f7fb"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.05 : night ? 1.4 : 1.8}
          position={[-8.2, 3.4, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[16, day ? 6 : 4.2, 1]}
          color={night ? "#8aa3c2" : "#eef3ff"}
        />
        <Lightformer
          form="rect"
          intensity={day ? 0.95 : night ? 1.15 : 1.55}
          position={[8.2, 3.1, 0.4]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[15, day ? 5.4 : 3.6, 1]}
          color={night ? "#c4b0a4" : "#fff6ec"}
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.55 : night ? 0.85 : 1.7}
          position={[0, 3.6, 10.5]}
          rotation={[0, Math.PI, 0]}
          scale={[14, 5, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.25 : night ? 1.05 : 1.45}
          position={[0, 3.2, -10.8]}
          scale={[12, 4.6, 1]}
          color="#ffffff"
        />
        {!day && (
          <Lightformer
            form="ring"
            intensity={night ? 0.85 : 1.2}
            position={[0, 6.4, -0.6]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={8}
            color="#ffffff"
          />
        )}
        <Lightformer
          form="rect"
          intensity={day ? 0.55 : night ? 0.14 : 0.28}
          position={[0, -0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[18, 18, 1]}
          color={day ? "#c5cad0" : "#6e747c"}
        />
      </Environment>
    </>
  );
}
function Floor({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
  const { day, night, bg, floor } = atmosphere(mode);
  const fadeMap = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.45)");
    grad.addColorStop(0.72, "rgba(0,0,0,0.88)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }, []);
  useEffect(() => () => fadeMap.dispose(), [fadeMap]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <circleGeometry args={[2000, 64]} />
        <meshBasicMaterial color={bg} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.015, 0]}
      >
        <circleGeometry args={[32, 64]} />
        <MeshReflectorMaterial
          resolution={high ? 1024 : 512}
          blur={[360, 130]}
          mixBlur={0.96}
          mixStrength={night ? 1.35 : day ? 2.2 : 1.85}
          mixContrast={0.82}
          roughness={night ? 0.94 : day ? 0.88 : 0.91}
          metalness={night ? 0.06 : day ? 0.08 : 0.1}
          color={floor}
          mirror={night ? 0.02 : day ? 0.05 : 0.04}
          depthScale={0.32}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.011, 0]}>
        <circleGeometry args={[32, 64]} />
        <meshBasicMaterial
          color={bg}
          alphaMap={fadeMap}
          transparent
          depthWrite={false}
        />
      </mesh>
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={night ? 0.68 : day ? 0.4 : 0.52}
        scale={48}
        blur={2.35}
        far={4.4}
        resolution={high ? 1024 : 512}
        color="#000000"
      />
    </>
  );
}
function Loading() {
  const { progress, active } = useProgress();
  return (
    <Html center>
      <div className="scene-loading">
        <span />
        {active ? `Loading vehicle ${Math.round(progress)}%` : "Preparing vehicle"}
      </div>
    </Html>
  );
}
function ContextGuard() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handler = (e: Event) => {
      e.preventDefault();
      window.dispatchEvent(new Event("studio-context-lost"));
    };
    canvas.addEventListener("webglcontextlost", handler);
    return () => canvas.removeEventListener("webglcontextlost", handler);
  }, [gl]);
  return null;
}
function PostFX({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
  if (!high) return null;
  const day = mode === "daylight",
    night = mode === "midnight";
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO
        aoRadius={0.24}
        intensity={night ? 0.78 : day ? 0.48 : 0.58}
        halfRes
      />
      <Bloom
        luminanceThreshold={3.4}
        luminanceSmoothing={0.28}
        intensity={0.05}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={night ? 0.34 : day ? 0.48 : 0.4}
        darkness={night ? 0.34 : day ? 0.14 : 0.24}
      />
    </EffectComposer>
  );
}
export function VehicleCanvas() {
  const quality = useStudio((s) => s.quality);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  const high = quality === "high" || !narrow;
  return (
    <Canvas
      shadows
      dpr={[1, high ? 1.75 : 1.25]}
      camera={{ position: [5.8, 2.7, -7.4], fov: 32, near: 0.035, far: 400 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.97,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      fallback={
        <div className="render-error">
          This studio needs WebGL. Try a browser with hardware acceleration
          enabled.
        </div>
      }
    >
      <ContextGuard />
      <ToneMap />
      <Lighting high={high} />
      <Suspense fallback={<Loading />}>
        <ActiveVehicle />
      </Suspense>
      <Floor high={high} />
      <CinematicControls />
      <PostFX high={high} />
    </Canvas>
  );
}
