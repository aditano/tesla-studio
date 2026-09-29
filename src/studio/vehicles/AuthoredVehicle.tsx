import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Interior, Paint, Variant, PartId } from "../catalog";
import { paintParams } from "../materials";
import { useStudio } from "../store";
import { usesImportedPresentation, vehicleGlb } from "./assets";
import { prepareHighland } from "./highland";
import { prepareImported } from "./imported";
import { LampBeams } from "./LampBeams";
import { suspensionLift, wheelsShareBody } from "./suspension";

function cabinTrim(model: string, interior: Interior) {
  if (model === "model-3") {
    if (interior.id === "white") return { dash: "#d4cfc6", carpet: "#3a3d42" };
    if (interior.id === "zen-grey") return { dash: "#8d9196", carpet: "#45484d" };
    return { dash: "#1c1e22", carpet: "#16181c" };
  }
  return {
    dash: interior.dash,
    carpet: interior.id === "white" || interior.id === "cream" ? "#4a463f" : "#14161a",
  };
}

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
  const imported = usesImportedPresentation(model);
  const asset = vehicleGlb(model);
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
  const view = useStudio((s) => s.feature);
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
  const wheelsLockedToBody = useMemo(
    () => wheelsShareBody(instance.scene),
    [instance],
  );
  useEffect(() => {
    elapsed.current = 0;
  }, [feature]);
  useLayoutEffect(() => {
    instance.materials.forEach((material) => {
      const m = material as THREE.MeshPhysicalMaterial;
      if (m.name === "exterior_paint") {
        const p = paintParams(paint);
        Object.assign(m, p, {
          color: new THREE.Color(p.color),
          sheenColor: new THREE.Color(p.sheenColor),
        });
        m.clearcoat = p.clearcoat;
        m.clearcoatRoughness = p.clearcoatRoughness;
        m.envMapIntensity = p.envMapIntensity;
        m.sheen = p.sheen;
        m.sheenRoughness = p.sheenRoughness;
        // Anisotropy needs per-vertex tangents. The imported meshes ship
        // without them, and the derived fallback yields NaNs on flat
        // exoskeleton panels that bloom then smears across the whole frame.
        m.anisotropy = 0;
      }
      if (model === "cybertruck" && m.name === "exterior_steel") {
        const inside = view === "interior";
        m.envMapIntensity = inside ? 0.32 : 1.15;
        m.roughness = inside ? 0.62 : 0.34;
        m.metalness = inside ? 0.7 : 0.96;
      }
      if (m.name === "interior_leather") {
        m.color.set(interior.leather);
        m.sheen = model === "cybertruck" ? 0.08 : 0.45;
        m.sheenRoughness = 0.36;
        m.sheenColor.set(interior.leather);
        m.roughness = model === "cybertruck" ? 0.86 : 0.62;
        m.metalness = 0;
        m.envMapIntensity = model === "cybertruck" ? 0.08 : 0.28;
      }
      if (m.name === "dashboard" || m.name === "carpet" || m.name === "display") {
        const trim = cabinTrim(model, interior);
        if (m.name === "dashboard") {
          m.color.set(trim.dash);
          m.map = null;
          m.roughness = 0.62;
          m.metalness = 0.04;
          m.envMapIntensity = 0.35;
        }
        if (m.name === "carpet") {
          m.color.set(trim.carpet);
          m.map = null;
          m.roughness = 0.94;
          m.metalness = 0;
          m.envMapIntensity = 0.12;
        }
        if (m.name === "display") {
          m.color.set("#10181c");
          m.emissive.set("#7eb8c4");
          m.emissiveIntensity = model === "model-3" ? 0.9 : model === "cybertruck" ? 0.6 : 0.45;
          m.roughness = 0.42;
          m.metalness = 0.02;
          m.envMapIntensity = 0.25;
        }
      }
      if (m.name === "brake_caliper") m.color.set(variant.caliper);
      if (m.name === "wheel_finish")
        m.color.set(variant.spoiler ? "#333941" : "#555e67");
      if (m.name === "headlight_led") {
        m.emissive.set("#f3f7ff");
        m.emissiveIntensity = lights ? 1.65 : 0;
        m.color.set("#f7fbff");
        m.metalness = 0.04;
        m.roughness = 0.32;
        m.toneMapped = true;
      }
      if (m.name === "signature_led") {
        m.emissive.set("#f3f7ff");
        m.emissiveIntensity = lights && lightBar ? 1.4 : 0;
        m.color.set("#f7fbff");
        m.metalness = 0.04;
        m.roughness = 0.3;
        m.toneMapped = true;
      }
      if (m.name === "taillight_led") {
        m.emissive.set("#ed1828");
        m.emissiveIntensity = lights ? 3.2 : 0.18;
        m.metalness = 0.16;
        m.roughness = 0.26;
      }
      if (m.name === "glass" || m.name === "lamp_lens") {
        m.transparent = true;
        m.opacity = m.name === "glass" ? 0.3 : 0.48;
        m.transmission = 0;
        m.thickness = 0;
        m.roughness = 0.06;
        m.metalness = 0.04;
        m.clearcoat = 1;
        m.clearcoatRoughness = 0.05;
        m.depthWrite = false;
        m.envMapIntensity = 1.35;
        if (model === "cybertruck" && m.name === "glass") {
          if (view === "interior") {
            m.side = THREE.DoubleSide;
            m.opacity = 0.78;
            m.color.set("#0c1824");
            m.envMapIntensity = 0.16;
            m.roughness = 0.24;
            m.metalness = 0;
            m.clearcoat = 0.15;
            m.depthWrite = true;
          } else {
            m.side = THREE.FrontSide;
            m.color.set("#6a8898");
          }
        }
        if (m.name === "lamp_lens") {
          m.emissive.set("#000000");
          m.emissiveIntensity = 0;
          m.color.set("#1c262e");
          m.opacity = 0.7;
          m.roughness = 0.16;
          m.envMapIntensity = 0.8;
        }
      }
      m.needsUpdate = true;
    });
    instance.scene.traverse((o) => {
      if (o.name.startsWith("highland_") || o.name.startsWith("cybertruck_cabin"))
        o.visible = view === "interior";
      if (o.name.startsWith("wheel_sport"))
        o.visible = !!variant.spoiler && !model.includes("cab");
      if (o.name.startsWith("wheel_standard"))
        o.visible = !variant.spoiler || model === "cybercab";
      if (o.name.startsWith("performance_spoiler"))
        o.visible = !!variant.spoiler;
      if (
        !highland &&
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
  }, [instance, paint, interior, variant, lights, lightBar, highland, model, view]);
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
      reduced || (window as unknown as { __teslaSnap?: boolean }).__teslaSnap
        ? b
        : THREE.MathUtils.damp(a, b, 5, dt);
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
        door.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.userData.hitVolume) {
            child.visible = true;
            return;
          }
          if (child.userData.presentationDetail) child.visible = active;
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          if (model !== "cybercab") return;
          if (!mats.some((m) => /glass|window/i.test(m.name))) return;
          if (child.userData.presentationDetail) return;
          child.position.y = damp(child.position.y, active ? -0.2 : 0);
        });
      }
      if (rig.hood) {
        const active = open.frunk || feature === "frunk";
        rig.hood.rotation.x = damp(rig.hood.rotation.x, active ? 0.82 : 0);
        rig.hood.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.userData.hitVolume) child.visible = true;
          else if (child.userData.presentationDetail) child.visible = active;
        });
      }
      if (rig.tailgate) {
        const active = open.trunk || feature === "trunk";
        rig.tailgate.rotation.x = damp(
          rig.tailgate.rotation.x,
          active
            ? model === "cybertruck"
              ? Math.PI / 2
              : -1.05
            : 0,
        );
        rig.tailgate.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          if (child.userData.hitVolume) child.visible = true;
          else if (child.userData.presentationDetail) child.visible = active;
        });
      }
      if (rig.charge_port)
        rig.charge_port.rotation.y = damp(
          rig.charge_port.rotation.y,
          open.charge || feature === "charge" ? -1.25 : 0,
        );
      if (rig.tonneau) {
        const active =
          open.tonneau || open.trunk || feature === "tonneau" || feature === "trunk";
        const slide = rig.tonneau.userData.slide as number | undefined;
        if (slide) {
          const closed =
            (rig.tonneau.userData.closedZ as number | undefined) ?? rig.tonneau.position.z;
          rig.tonneau.userData.closedZ = closed;
          rig.tonneau.position.z = damp(rig.tonneau.position.z, active ? closed - slide : closed);
          rig.tonneau.scale.set(1, 1, 1);
        } else {
          const target = active ? 0.035 : 1;
          const scale = damp(rig.tonneau.scale.z, target);
          rig.tonneau.scale.set(1, scale, scale);
        }
      }
    }
    if (rig.body) {
      const target =
        ride -
        (variant.lowered ?? 0) +
        suspensionLift(feature, reduced, elapsed.current, wheelsLockedToBody);
      rig.body.position.y = damp(rig.body.position.y, target);
    }
    // Pulse during the light bar demo, and settle back to the steady level
    // afterwards instead of freezing on whatever frame the demo ended on.
    const pulse = feature === "lightbar" && !reduced;
    const signature =
      lights && lightBar
        ? 1.4 + (pulse ? Math.sin(elapsed.current * 3) * 0.2 : 0)
        : 0;
    instance.materials.forEach((m) => {
      if (m.name === "signature_led") m.emissiveIntensity = signature;
    });
  });
  // The authored Cybercab merges its beltline trim and door-shut seals into
  // the body's trim meshes, so they stayed behind as a rail across the open
  // doorway. Move those triangles onto the door that carries them, and add a
  // painted sill so the opening has a floor edge.
  useEffect(() => {
    if (model !== "cybercab" || !rig.body) return;
    const moved: THREE.Mesh[] = [];
    const restore: [THREE.Mesh, THREE.BufferAttribute | null][] = [];
    for (const side of [-1, 1] as const) {
      const door = rig[side < 0 ? "door_fl" : "door_fr"];
      if (!door) continue;
      rig.body.updateWorldMatrix(true, true);
      const toDoor = door.matrixWorld.clone().invert();
      rig.body.children.forEach((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const name = (child.material as THREE.Material).name;
        if (name !== "satin_trim" && name !== "panel_seal") return;
        const index = child.geometry.getIndex();
        const pos = child.geometry.getAttribute("position");
        if (!index) return;
        const keep: number[] = [];
        const take: number[] = [];
        const v = new THREE.Vector3();
        for (let i = 0; i < index.count; i += 3) {
          let x = 0, y = 0, z = 0;
          for (let k = 0; k < 3; k++) {
            v.fromBufferAttribute(pos, index.getX(i + k)).applyMatrix4(child.matrix);
            x += v.x / 3; y += v.y / 3; z += v.z / 3;
          }
          const onDoor = side * x > 0.8 && y > 0.3 && y < 1.02 && z > -0.8 && z < 0.95;
          (onDoor ? take : keep).push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
        }
        if (!take.length) return;
        restore.push([child, index]);
        child.geometry.setIndex(keep);
        const piece = new THREE.Mesh(child.geometry.clone(), child.material);
        piece.geometry.setIndex(take);
        piece.geometry.applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(toDoor, child.matrixWorld),
        );
        piece.name = "cab_door_trim";
        piece.castShadow = piece.receiveShadow = true;
        door.add(piece);
        moved.push(piece);
      });
    }
    const paint = [...instance.materials.values()].find((m) => m.name === "exterior_paint");
    const sills: THREE.Mesh[] = [];
    if (paint)
      for (const side of [-1, 1]) {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 1.62), paint);
        sill.position.set(side * 0.8, 0.31, 0.07);
        sill.name = "cab_sill";
        sill.castShadow = sill.receiveShadow = true;
        rig.body.add(sill);
        sills.push(sill);
      }
    return () => {
      moved.forEach((m) => {
        m.removeFromParent();
        m.geometry.dispose();
      });
      restore.forEach(([mesh, index]) => mesh.geometry.setIndex(index));
      sills.forEach((m) => {
        m.removeFromParent();
        m.geometry.dispose();
      });
    };
  }, [model, rig, instance]);
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
        useStudio.getState().togglePart(part);
        break;
      }
    }
  };
  return (
    <group>
      <primitive object={instance.scene} dispose={null} onClick={click} />
      <LampBeams model={model} on={lights} body={rig.body} />
    </group>
  );
}
