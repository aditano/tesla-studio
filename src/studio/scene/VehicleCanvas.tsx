import { useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useStudio } from "../store";
import { ActiveVehicle } from "../vehicles/ActiveVehicle";

function StudioFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[10, 72]} />
      <MeshReflectorMaterial
        blur={[350, 90]}
        resolution={1024}
        mixBlur={0.9}
        mixStrength={36}
        roughness={0.72}
        depthScale={1.05}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.35}
        color="#050608"
        metalness={0.78}
      />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight intensity={0.08} color="#d6deea" groundColor="#000000" />
      <spotLight
        position={[5.2, 8.2, -1.6]}
        angle={0.42}
        penumbra={1}
        intensity={48}
        color="#f4f7ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00012}
      />
      <spotLight position={[-6.5, 5.2, 2.8]} angle={0.5} penumbra={1} intensity={16} color="#8ea6c4" />
      <spotLight position={[0, 7, 7]} angle={0.38} penumbra={1} intensity={10} color="#ffffff" />
      <Environment preset="city" environmentIntensity={0.72} />
      <Environment resolution={256} environmentIntensity={0.28}>
        <Lightformer intensity={4.2} position={[0, 6.2, -1.2]} scale={[14, 0.65, 1]} color="#ffffff" />
        <Lightformer intensity={5.5} position={[7.5, 2.2, 0]} scale={[0.55, 8, 1]} color="#e8eef8" />
        <Lightformer intensity={1.8} position={[-8, 2.6, 1.2]} scale={[0.65, 10, 1]} color="#9bb0c8" />
      </Environment>
    </>
  );
}

function CameraRig() {
  const width = useThree((s) => s.size.width);
  const camera = useThree((s) => s.camera);
  const narrow = width < 768;
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = narrow ? 42 : 28;
    cam.updateProjectionMatrix();
  }, [camera, narrow]);
  return null;
}

function StudioControls() {
  const autoRotate = useStudio((s) => s.autoRotate);
  const setAutoRotate = useStudio((s) => s.setAutoRotate);
  const width = useThree((s) => s.size.width);
  const narrow = width < 768;
  const target = useMemo<[number, number, number]>(
    () => (narrow ? [0, 0.52, 0] : [0, 0.68, 0]),
    [narrow],
  );
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      minPolarAngle={narrow ? 0.92 : 0.82}
      maxPolarAngle={1.42}
      minDistance={narrow ? 6.4 : 4.6}
      maxDistance={narrow ? 16 : 13}
      target={target}
      onStart={() => setAutoRotate(false)}
    />
  );
}

export function VehicleCanvas() {
  const setAutoRotate = useStudio((s) => s.setAutoRotate);

  return (
    <Canvas
      shadows
      dpr={[1, 1.85]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
        alpha: false,
      }}
      camera={{ position: [5.1, 1.55, -5.9], fov: 28, near: 0.1, far: 90 }}
      onPointerDown={() => setAutoRotate(false)}
      style={{ touchAction: "none", background: "#000" }}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 24]} />
      <CameraRig />
      <Lights />
      <ActiveVehicle />
      <StudioFloor />
      <ContactShadows position={[0, 0.008, 0]} opacity={0.62} scale={16} blur={2.1} far={6} color="#000" />
      <StudioControls />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <N8AO aoRadius={0.55} intensity={1.35} halfRes />
        <SMAA />
        <Bloom luminanceThreshold={1.05} intensity={0.55} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.58} />
      </EffectComposer>
    </Canvas>
  );
}
