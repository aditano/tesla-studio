import { Suspense, useEffect, useRef, useState } from "react";
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

function ToneMap() {
  const mode = useStudio((s) => s.environment);
  const gl = useThree((s) => s.gl);
  const exposure =
    mode === "daylight" ? 0.96 : mode === "midnight" ? 0.88 : 1.03;
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

function Lighting({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
  const day = mode === "daylight",
    night = mode === "midnight";
  const bg = day ? "#9aa3ab" : night ? "#050810" : "#1a1f26";
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, day ? 20 : 15, day ? 56 : 44]} />
      <hemisphereLight
        intensity={day ? 0.82 : night ? 0.2 : 0.36}
        color={day ? "#eef3f8" : night ? "#8ea2be" : "#dce6f0"}
        groundColor={day ? "#61666d" : night ? "#080a0e" : "#26292e"}
      />
      <directionalLight
        position={[-3.2, 8, -4.2]}
        intensity={day ? 1.75 : night ? 0.42 : 1.2}
        color={day ? "#fff1d6" : night ? "#b7c6de" : "#f3f6ff"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00022}
        shadow-normalBias={0.022}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-camera-left={-6.5}
        shadow-camera-right={6.5}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-6.5}
      />
      <directionalLight
        position={[4.4, 3.2, 3.2]}
        intensity={day ? 0.48 : night ? 0.18 : 0.32}
        color={night ? "#7f9ac4" : "#fff4ea"}
      />
      {!day && (
        <directionalLight
          position={[1.2, 2.4, -5.5]}
          intensity={night ? 0.12 : 0.16}
          color={night ? "#d4a898" : "#ffe8d2"}
        />
      )}
      <Environment resolution={high ? 512 : 256} frames={1} key={mode}>
        <Lightformer
          form="rect"
          intensity={day ? 3.2 : night ? 1.6 : 3.8}
          position={[0, 7.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={day ? [18, 12, 1] : [14, 6, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.4 : night ? 3.4 : 7.2}
          position={[0, 7, -0.8]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[18, day ? 1.6 : 0.28, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.5 : night ? 2.6 : 5.4}
          position={[-6.4, 2.1, 0.2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[12, day ? 2.4 : 0.42, 1]}
          color={night ? "#6d8fbf" : "#e7eeff"}
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.4 : night ? 2.2 : 4.8}
          position={[6.4, 1.8, 0.6]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[11, day ? 2 : 0.36, 1]}
          color={night ? "#c9847a" : "#fff3e6"}
        />
        <Lightformer
          form="rect"
          intensity={day ? 2 : night ? 1.1 : 2.2}
          position={[0, 3.4, 8.2]}
          rotation={[0, Math.PI, 0]}
          scale={[8, 2.6, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 1.5 : night ? 1.4 : 2}
          position={[0, 2.6, -8.5]}
          scale={[7, 3, 1]}
          color="#ffffff"
        />
        {!day && (
          <Lightformer
            form="ring"
            intensity={night ? 1.4 : 2.4}
            position={[0, 5.6, -1.2]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={7}
            color="#ffffff"
          />
        )}
        <Lightformer
          form="rect"
          intensity={day ? 0.7 : night ? 0.18 : 0.35}
          position={[0, -0.35, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
          color={day ? "#c5cad0" : "#7a8088"}
        />
      </Environment>
    </>
  );
}
function Floor({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
  const day = mode === "daylight",
    night = mode === "midnight";
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.015, 0]}
      >
        <planeGeometry args={[120, 120]} />
        <MeshReflectorMaterial
          resolution={high ? 1024 : 512}
          blur={[320, 110]}
          mixBlur={0.92}
          mixStrength={night ? 1.8 : day ? 3.1 : 2.4}
          mixContrast={0.88}
          roughness={night ? 0.92 : day ? 0.84 : 0.88}
          metalness={night ? 0.1 : day ? 0.12 : 0.16}
          color={day ? "#8b9198" : night ? "#14171c" : "#2a2e34"}
          mirror={night ? 0.04 : day ? 0.08 : 0.06}
          depthScale={0.42}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={night ? 0.7 : day ? 0.44 : 0.56}
        scale={15}
        blur={2.15}
        far={4.2}
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
        aoRadius={0.28}
        intensity={night ? 0.9 : day ? 0.62 : 0.72}
        halfRes
      />
      <Bloom
        luminanceThreshold={2.2}
        luminanceSmoothing={0.22}
        intensity={0.14}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={night ? 0.32 : day ? 0.44 : 0.36}
        darkness={night ? 0.4 : day ? 0.18 : 0.3}
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
      camera={{ position: [5.8, 2.7, -7.4], fov: 32, near: 0.035, far: 150 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.03,
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
