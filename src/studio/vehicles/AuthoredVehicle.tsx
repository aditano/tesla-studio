import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Interior, Paint, Variant, PartId } from "../catalog";
import { paintParams } from "../materials";
import { useStudio } from "../store";
import { prepareHighland } from "./highland";
import { prepareImported } from "./imported";

const partNames: Record<string, PartId> = {
  door_fl: "door-fl",
  door_fr: "door-fr",
  door_rl: "door-rl",
  door_rr: "door-rr",
  hood: "frunk",
  tailgate: "trunk",
  charge_port: "charge",
  tonneau: "tonneau",
};

export function cloneAuthored(source: THREE.Group) {
  const scene = source.clone(true);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const copy = (material: THREE.Material) => {
      let m = materials.get(material.uuid);
      if (!m) {
        m = material.clone() as THREE.MeshStandardMaterial;
        materials.set(material.uuid, m);
      }
      return m;
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(copy)
      : copy(o.material);
  });
  return { scene, materials };
}

export function AuthoredVehicle({
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
  const highland = model === "model-3";
  const imported = model === "model-y";
  const asset = highland
    ? "highland/model.glb"
    : imported
      ? "juniper/model.glb"
      : `authored/${model}.glb`;
  const { scene: source } = useGLTF(
    `${import.meta.env.BASE_URL}models/${asset}`,
    false,
    true,
  );
  const instance = useMemo(
    () =>
      highland
        ? prepareHighland(source)
        : imported
          ? prepareImported(source, model)
          : cloneAuthored(source),
    [source, highland, imported, model],
  );
  const rig = useMemo(
    () =>
      Object.fromEntries(
        ["body", ...Object.keys(partNames)].map((name) => [
          name,
          instance.scene.getObjectByName(name),
        ]),
      ),
    [instance],
  );
  const feature = useStudio((s) => s.demoFeature);
  const open = useStudio((s) => s.open);
  const lights = useStudio((s) => s.lightsOn);
  const lightBar = useStudio((s) => s.lightBarOn);
  const ride = useStudio((s) => s.ride);
  const elapsed = useRef(0);
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const staticBody = "staticBody" in instance && instance.staticBody;
  useEffect(() => {
    elapsed.current = 0;
  }, [feature]);
  useLayoutEffect(() => {
    instance.materials.forEach((material) => {
      const m = material as THREE.MeshPhysicalMaterial;
      if (m.name === "exterior_paint" || m.name === "exterior_steel") {
        const p = paintParams(paint);
        Object.assign(m, p, {
          color: new THREE.Color(p.color),
          sheenColor: new THREE.Color(p.sheenColor),
        });
        m.anisotropy = paint.finish === "stainless" ? 0.65 : 0;
      }
      if (m.name === "interior_leather") m.color.set(interior.leather);
      if (m.name === "brake_caliper") m.color.set(variant.caliper);
      if (m.name === "wheel_finish")
        m.color.set(variant.spoiler ? "#333941" : "#555e67");
      if (m.name === "headlight_led") m.emissiveIntensity = lights ? 2.5 : 0;
      if (m.name === "signature_led") m.emissiveIntensity = lightBar ? 2.5 : 0;
      if (m.name === "glass" || m.name === "lamp_lens") {
        m.transparent = true;
        m.opacity = m.name === "glass" ? 0.3 : 0.55;
        m.transmission = 0;
        m.thickness = 0;
        m.roughness = 0.06;
        m.metalness = 0.04;
        m.clearcoat = 1;
        m.clearcoatRoughness = 0.05;
        m.depthWrite = false;
        m.envMapIntensity = 1.35;
      }
    });
    instance.scene.traverse((o) => {
      if (o.name.startsWith("wheel_sport"))
        o.visible = !!variant.spoiler && !model.includes("cab");
      if (o.name.startsWith("wheel_standard"))
        o.visible = !variant.spoiler || model === "cybercab";
      if (o.name.startsWith("performance_spoiler"))
        o.visible = !!variant.spoiler;
      if (
        !highland &&
        !imported &&
        /^wheel_(fl|fr|rl|rr)$/.test(o.name) &&
        o.parent === instance.scene
      ) {
        const authored = o.userData.authoredRadius ?? o.position.y;
        o.userData.authoredRadius = authored;
        const scale = variant.wheelRadius / authored;
        o.scale.setScalar(scale);
        o.position.y = variant.wheelRadius;
      }
    });
  }, [instance, paint, interior, variant, lights, lightBar, model]);
  useEffect(
    () => () => {
      instance.materials.forEach((m) => m.dispose());
      if ("ownsGeometry" in instance)
        instance.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
    },
    [instance],
  );
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const damp = (a: number, b: number) =>
      reduced ? b : THREE.MathUtils.damp(a, b, 5, dt);
    if (!staticBody) {
      for (const name of ["door_fl", "door_fr", "door_rl", "door_rr"]) {
        const door = rig[name];
        if (!door) continue;
        const side = name.endsWith("l") ? -1 : 1;
        const active =
          open[partNames[name]] ||
          feature === "doors" ||
          feature === "butterfly";
        door.rotation.y = damp(
          door.rotation.y,
          active ? side * (model === "cybercab" ? 0.28 : 1.03) : 0,
        );
        if (model === "cybercab")
          door.rotation.z = damp(
            door.rotation.z,
            active ? side * 1.12 : 0,
          );
      }
      if (rig.hood)
        rig.hood.rotation.x = damp(
          rig.hood.rotation.x,
          open.frunk || feature === "frunk" ? 0.82 : 0,
        );
      if (rig.tailgate)
        rig.tailgate.rotation.x = damp(
          rig.tailgate.rotation.x,
          open.trunk || feature === "trunk"
            ? model === "cybertruck"
              ? Math.PI / 2
              : -1.05
            : 0,
        );
      if (rig.charge_port)
        rig.charge_port.rotation.y = damp(
          rig.charge_port.rotation.y,
          open.charge || feature === "charge" ? -1.25 : 0,
        );
      if (rig.tonneau) {
        const target =
          open.tonneau || open.trunk || feature === "tonneau" || feature === "trunk"
            ? 0.035
            : 1;
        const scale = damp(rig.tonneau.scale.z, target);
        rig.tonneau.scale.set(1, scale, scale);
      }
    }
    if (rig.body) {
      const target =
        ride -
        (variant.lowered ?? 0) +
        (feature === "suspension"
          ? reduced
            ? 0.13
            : 0.13 * (1 - Math.cos(elapsed.current * 1.5))
          : 0);
      rig.body.position.y = damp(rig.body.position.y, target);
    }
    if (feature === "lightbar" && !reduced)
      instance.materials.forEach((m) => {
        if (m.name === "signature_led")
          m.emissiveIntensity = lightBar
            ? 2.4 + Math.sin(elapsed.current * 3) * 0.9
            : 0;
      });
  });
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (staticBody) return;
    for (
      let object: THREE.Object3D | null = event.object;
      object;
      object = object.parent
    ) {
      const part = partNames[object.name];
      if (part) {
        event.stopPropagation();
        const s = useStudio.getState();
        if (s.feature) s.setFeature(null);
        else s.togglePart(part);
        return;
      }
    }
  };
  return (
    <primitive object={instance.scene} dispose={null} onClick={click} />
  );
}
