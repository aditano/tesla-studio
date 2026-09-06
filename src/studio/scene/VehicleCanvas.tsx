import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
  Html,
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

import { SHOTS } from "./shots";

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
    const shot = SHOTS[feature ?? "overview"];
    const target = new THREE.Vector3(...shot.target);
    const end = new THREE.Vector3(...shot.position);
    if (feature !== "interior") {
      end
        .sub(target)
        .multiplyScalar(
          (model === "cybertruck" ? 1.13 : 1) * (size.width < 768 ? 1.28 : 1),
        )
        .add(target);
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
      minDistance={feature === "interior" ? 0.25 : 3.4}
      maxDistance={18}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.025}
      onStart={() => {
        flight.current = null;
        useStudio.getState().setAutoRotate(false);
        window.dispatchEvent(new Event("studio-manual-orbit"));
      }}
    />
  );
}

function Lighting() {
  const mode = useStudio((s) => s.environment);
  const day = mode === "daylight",
    night = mode === "midnight";
  return (
    <>
      <color
        attach="background"
        args={[day ? "#a4adb4" : night ? "#060b15" : "#22272e"]}
      />
      <fog
        attach="fog"
        args={[day ? "#a4adb4" : night ? "#060b15" : "#22272e", 16, 48]}
      />
      <hemisphereLight
        intensity={day ? 1.2 : 0.35}
        color="#dfebff"
        groundColor="#42434a"
      />
      <directionalLight
        position={[-3, 7, -5]}
        intensity={day ? 3 : 1.1}
        color={day ? "#fff3df" : "#edf2ff"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <Environment resolution={256} frames={1} key={mode}>
        <Lightformer
          form="rect"
          intensity={day ? 3 : 6}
          position={[0, 6, -2]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[9, 4, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={day ? 2 : 4}
          position={[-5, 3, 0]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[8, 2, 1]}
          color={night ? "#78a8ff" : "#e8efff"}
        />
        <Lightformer
          form="rect"
          intensity={day ? 2 : 5}
          position={[5, 2, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[7, 1.2, 1]}
          color={night ? "#ef8780" : "#fff4e8"}
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, 3, 6]}
          rotation={[0, Math.PI, 0]}
          scale={[6, 2, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          position={[0, 2, -7]}
          scale={[5, 3, 1]}
          color="#ffffff"
        />
      </Environment>
    </>
  );
}
function Floor({ high }: { high: boolean }) {
  const mode = useStudio((s) => s.environment);
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
          blur={[250, 90]}
          mixBlur={0.85}
          mixStrength={mode === "midnight" ? 12 : 5}
          roughness={0.8}
          metalness={0.25}
          color={mode === "daylight" ? "#a1a6ac" : "#30343b"}
          mirror={0.15}
          depthScale={0.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
        />
      </mesh>
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.58}
        scale={14}
        blur={2.6}
        far={5}
        resolution={high ? 1024 : 512}
        color="#000000"
      />
    </>
  );
}
function Loading() {
  return (
    <Html center>
      <div className="scene-loading">
        <span />
        Preparing vehicle
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
        toneMappingExposure: 1.12,
        alpha: false,
        powerPreference: "high-performance",
      }}
      fallback={
        <div className="render-error">
          This studio needs WebGL. Try a browser with hardware acceleration
          enabled.
        </div>
      }
    >
      <ContextGuard />
      <Lighting />
      <Suspense fallback={<Loading />}>
        <ActiveVehicle />
      </Suspense>
      <Floor high={high} />
      <CinematicControls />
      {high ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={0.4} intensity={1.3} halfRes />
          <Bloom luminanceThreshold={1.8} intensity={0.22} mipmapBlur />
          <Vignette eskil={false} offset={0.35} darkness={0.35} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
