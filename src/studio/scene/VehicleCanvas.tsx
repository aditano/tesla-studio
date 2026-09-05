import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useStudio } from "../store";
import { ActiveVehicle } from "../vehicles/ActiveVehicle";

function StudioFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[9, 64]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={768}
        mixBlur={1}
        mixStrength={28}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.4}
        color="#07080a"
        metalness={0.72}
      />
    </mesh>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight intensity={0.12} color="#d6deea" groundColor="#000000" />
      <spotLight
        position={[4.5, 7.5, -2]}
        angle={0.45}
        penumbra={1}
        intensity={55}
        color="#f3f6ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00015}
      />
      <spotLight position={[-6, 5, 3]} angle={0.5} penumbra={1} intensity={18} color="#8ea6c4" />
      <spotLight position={[0, 6, 6]} angle={0.4} penumbra={1} intensity={12} color="#ffffff" />
      <Environment resolution={256} environmentIntensity={0.55}>
        <Lightformer intensity={2.2} position={[0, 5.5, -1]} scale={[9, 1.2, 1]} color="#ffffff" />
        <Lightformer intensity={4.5} position={[6, 2, 0]} scale={[1.2, 6, 1]} color="#e8eef8" />
        <Lightformer intensity={1.6} position={[-7, 2.5, 1]} scale={[1.2, 8, 1]} color="#9bb0c8" />
        <Lightformer intensity={2.4} position={[0, 1, -8]} scale={[12, 4, 1]} color="#ffffff" />
        <Lightformer intensity={0.7} position={[0, 8, 8]} scale={[14, 4, 1]} color="#6f7f96" />
      </Environment>
    </>
  );
}

export function VehicleCanvas() {
  const autoRotate = useStudio((s) => s.autoRotate);
  const setAutoRotate = useStudio((s) => s.setAutoRotate);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        alpha: false,
      }}
      camera={{ position: [4.8, 1.65, -5.6], fov: 32, near: 0.1, far: 80 }}
      onPointerDown={() => setAutoRotate(false)}
      style={{ touchAction: "none", background: "#000" }}
    >
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 9, 22]} />
      <Lights />
      <ActiveVehicle />
      <StudioFloor />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.55}
        scale={14}
        blur={2.4}
        far={5}
        color="#000"
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={0.55}
        minPolarAngle={0.78}
        maxPolarAngle={1.42}
        minDistance={4.4}
        maxDistance={13}
        target={[0, 0.72, 0]}
      />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <SMAA />
        <Bloom luminanceThreshold={1.15} intensity={0.42} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
