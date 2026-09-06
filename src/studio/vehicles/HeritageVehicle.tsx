import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { paintParams } from "../materials";
import type { Interior, Paint, Variant } from "../catalog";
import { useStudio } from "../store";

type Panel = "fixed" | "left" | "right" | "hood" | "hatch";
const pivots: Record<Panel, [number, number, number]> = {
  fixed: [0, 0, 0],
  left: [-0.82, 0.7, -0.85],
  right: [0.82, 0.7, -0.85],
  hood: [0, 0.9, -0.95],
  hatch: [0, 1, 1.25],
};

/** Bake the authored transforms once. Partition the static asset into illustrative hinged panels.
 * The original mesh/UVs remain intact; this is a presentation rig, not factory CAD. */
export function prepareHeritage(source: THREE.Group, model: string) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  const scale =
    (model === "model-3-heritage" ? 4.69 : 4.97) /
    (bounds.max.z - bounds.min.z);
  const transform = new THREE.Matrix4()
    .makeRotationY(Math.PI)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(
      new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z),
    );
  const panels = Object.fromEntries(
    Object.keys(pivots).map((k) => [k, new THREE.Group()]),
  ) as Record<Panel, THREE.Group>;
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = (
      Array.isArray(object.material) ? object.material[0] : object.material
    ) as THREE.MeshStandardMaterial;
    let material = materials.get(original.name);
    if (!material) {
      material = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material, original);
      material.name = original.name;
      material.side = THREE.DoubleSide;
      material.envMapIntensity = 1;
      materials.set(original.name, material);
    }
    const geometry = object.geometry
      .clone()
      .applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(transform, object.matrixWorld),
      );
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const indices: Record<Panel, number[]> = {
      fixed: [],
      left: [],
      right: [],
      hood: [],
      hatch: [],
    };
    const movable = !/wheel|cal[._]|^cal_|_int_|int_Material/i.test(
      object.name,
    );
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      const ids = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
      const x = ids.reduce((v, j) => v + position.getX(j), 0) / 3;
      const y = ids.reduce((v, j) => v + position.getY(j), 0) / 3;
      const z = ids.reduce((v, j) => v + position.getZ(j), 0) / 3;
      let panel: Panel = "fixed";
      if (movable) {
        if (Math.abs(x) > 0.67 && z > -0.85 && z < 0.83 && y > 0.37 && y < 1.3)
          panel = x < 0 ? "left" : "right";
        else if (Math.abs(x) < 0.76 && z < -0.97 && z > -2.13 && y > 0.76)
          panel = "hood";
        else if (Math.abs(x) < 0.79 && z > 1.27 && y > 0.79) panel = "hatch";
      }
      indices[panel].push(...ids);
    }
    for (const panel of Object.keys(indices) as Panel[]) {
      if (!indices[panel].length) continue;
      const part = geometry.clone();
      part.setIndex(indices[panel]);
      part.translate(
        ...(pivots[panel].map((v) => -v) as [number, number, number]),
      );
      part.computeBoundingSphere();
      const mesh = new THREE.Mesh(part, material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      panels[panel].add(mesh);
    }
    geometry.dispose();
  });
  return { panels, materials };
}

export function HeritageVehicle({
  model,
  paint,
  interior,
  variant,
}: {
  model: string;
  paint: Paint;
  interior: Interior;
  variant: Variant;
}) {
  const { scene } = useGLTF(
    `${import.meta.env.BASE_URL}models/${model}/scene.gltf`,
  );
  const prepared = useMemo(() => prepareHeritage(scene, model), [scene, model]);
  const feature = useStudio((s) => s.demoFeature);
  const open = useStudio((s) => s.open);
  const lights = useStudio((s) => s.lightsOn);
  const refs = useRef<Partial<Record<Panel, THREE.Group>>>({});
  useLayoutEffect(() => {
    prepared.materials.forEach((mat, name) => {
      const is3 = model === "model-3-heritage";
      const body = is3 ? name === "CAR_PAINT" : name === "material_9";
      if (body) {
        Object.assign(mat, paintParams(paint), {
          color: new THREE.Color(paint.hex),
          sheenColor: new THREE.Color(paint.flake ?? "#ffffff"),
        });
      }
      if ((is3 && name === "Material.015") || (!is3 && name === "material"))
        mat.color.set(interior.leather);
      if ((is3 && name === "Material.014") || (!is3 && name === "Material.008"))
        mat.color.set(variant.caliper);
      if ((is3 && name === "Material.011") || name === "Rims") {
        mat.color.set(variant.spoiler ? "#454a50" : "#b9c0c8");
        mat.metalness = 0.95;
        mat.roughness = 0.23;
      }
      if (
        (is3 && /Material.01[67]/.test(name)) ||
        (!is3 && name === "Material.002")
      ) {
        mat.color.set("#141c24");
        mat.metalness = 0.3;
        mat.roughness = 0.09;
        mat.clearcoat = 1;
        mat.transparent = true;
        mat.opacity = 0.82;
      }
      if (name === "LED_PHARE" || name === "emit") {
        mat.emissive.set("#e5f0ff");
        mat.emissiveIntensity = lights ? 3 : 0;
      }
      mat.needsUpdate = true;
    });
  }, [prepared, paint, interior, variant, lights, model]);
  useEffect(
    () => () => {
      Object.values(prepared.panels).forEach((g) =>
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        }),
      );
      prepared.materials.forEach((m) => m.dispose());
    },
    [prepared],
  );
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (const id of ["left", "right", "hood", "hatch"] as Panel[]) {
      const g = refs.current[id];
      if (!g) continue;
      const door = id === "left" || id === "right";
      const active = door
        ? feature === "doors" || open[id === "left" ? "door-fl" : "door-fr"]
        : id === "hood"
          ? feature === "frunk" || open.frunk
          : feature === "trunk" || open.trunk;
      const angle = active
        ? id === "left"
          ? -1.05
          : id === "right"
            ? 1.05
            : id === "hood"
              ? -0.75
              : 0.95
        : 0;
      const axis = door ? "y" : "x";
      g.rotation[axis] = THREE.MathUtils.damp(g.rotation[axis], angle, 4, dt);
    }
  });
  return (
    <group position={[0, -(variant.lowered ?? 0), 0]}>
      {(Object.keys(pivots) as Panel[]).map((id) => (
        <group
          key={id}
          position={pivots[id]}
          ref={(g) => {
            if (g) refs.current[id] = g;
          }}
          onClick={
            id === "fixed"
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  useStudio
                    .getState()
                    .togglePart(
                      id === "left"
                        ? "door-fl"
                        : id === "right"
                          ? "door-fr"
                          : id === "hood"
                            ? "frunk"
                            : "trunk",
                    );
                }
          }
        >
          <primitive object={prepared.panels[id]} />
        </group>
      ))}
      <mesh position={[0, 0.66, -1.52]}>
        <boxGeometry args={[1.22, 0.18, 0.8]} />
        <meshStandardMaterial color="#15171a" roughness={0.93} />
      </mesh>
      <mesh position={[0, 0.64, 1.68]}>
        <boxGeometry args={[1.25, 0.18, 0.75]} />
        <meshStandardMaterial color="#181a1d" roughness={0.95} />
      </mesh>
      {variant.spoiler && (
        <mesh position={[0, 1.03, 2.05]} rotation={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[1.35, 0.028, 0.15]} />
          <meshPhysicalMaterial
            color="#202226"
            metalness={0.6}
            roughness={0.3}
            clearcoat={1}
          />
        </mesh>
      )}
    </group>
  );
}
