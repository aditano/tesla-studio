import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Interior, Paint, Variant, PartId } from "../catalog";
import { applyExteriorPaint, applyInteriorFinish, steelParams } from "../materials";
import { addCabinKit, applyDisplay } from "./cabin";
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

/** Rehome Cybercab beltline/seal tris onto the doors without mutating shared
 * cached GLTF geometry. Scene clones share BufferGeometry, so every index
 * edit must happen on a clone. */
export function attachCybercabDoorTrim(
  body: THREE.Object3D,
  doors: {
    left?: THREE.Object3D | null;
    right?: THREE.Object3D | null;
    paint?: THREE.Material;
  },
) {
  const moved: THREE.Mesh[] = [];
  const restore: [THREE.Mesh, THREE.BufferGeometry][] = [];
  const sills: THREE.Mesh[] = [];
  const trims = body.children.filter(
    (child): child is THREE.Mesh =>
      child instanceof THREE.Mesh &&
      (((child.material as THREE.Material).name === "satin_trim") ||
        (child.material as THREE.Material).name === "panel_seal"),
  );

  body.updateWorldMatrix(true, true);
  for (const child of trims) {
    const sourceGeom = child.geometry;
    const index = sourceGeom.getIndex();
    const pos = sourceGeom.getAttribute("position");
    if (!index) continue;

    const keep: number[] = [];
    const takeLeft: number[] = [];
    const takeRight: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < index.count; i += 3) {
      let x = 0,
        y = 0,
        z = 0;
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(pos, index.getX(i + k)).applyMatrix4(child.matrix);
        x += v.x / 3;
        y += v.y / 3;
        z += v.z / 3;
      }
      const onBelt = y > 0.3 && y < 1.02 && z > -0.8 && z < 0.95;
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (onBelt && x > 0.8) takeRight.push(...tri);
      else if (onBelt && x < -0.8) takeLeft.push(...tri);
      else keep.push(...tri);
    }
    if (!takeLeft.length && !takeRight.length) continue;

    // Clone before any index edit so the useGLTF cache stays pristine.
    restore.push([child, sourceGeom]);
    const bodyGeom = sourceGeom.clone();
    bodyGeom.setIndex(keep);
    child.geometry = bodyGeom;

    for (const [take, door] of [
      [takeLeft, doors.left],
      [takeRight, doors.right],
    ] as const) {
      if (!take.length || !door) continue;
      const toDoor = door.matrixWorld.clone().invert();
      const pieceGeom = sourceGeom.clone();
      pieceGeom.setIndex(take);
      pieceGeom.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(toDoor, child.matrixWorld),
      );
      const piece = new THREE.Mesh(pieceGeom, child.material);
      piece.name = "cab_door_trim";
      piece.castShadow = piece.receiveShadow = true;
      door.add(piece);
      moved.push(piece);
    }
  }

  if (doors.paint)
    for (const side of [-1, 1]) {
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 1.62), doors.paint);
      sill.position.set(side * 0.8, 0.31, 0.07);
      sill.name = "cab_sill";
      sill.castShadow = sill.receiveShadow = true;
      body.add(sill);
      sills.push(sill);
    }

  return () => {
    moved.forEach((m) => {
      m.removeFromParent();
      m.geometry.dispose();
    });
    restore.forEach(([mesh, geom]) => {
      const current = mesh.geometry;
      mesh.geometry = geom;
      if (current !== geom) current.dispose();
    });
    sills.forEach((m) => {
      m.removeFromParent();
      m.geometry.dispose();
    });
  };
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
  const instance = useMemo(() => {
    const prepared = highland
      ? prepareHighland(source)
      : imported
        ? prepareImported(source, model)
        : cloneAuthored(source);
    if (model === "cybercab") {
      addCabinKit(
        prepared.scene,
        prepared.materials as Map<string, THREE.MeshPhysicalMaterial>,
        "cybercab",
      );
    }
    return prepared;
  }, [source, highland, imported, model]);
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
      if (m.name === "exterior_paint") applyExteriorPaint(m, paint);
      if (model === "cybertruck" && m.name === "exterior_steel") {
        const steel = steelParams(paint);
        const inside = view === "interior";
        m.color.set(steel.color);
        m.roughness = inside ? Math.max(steel.roughness, 0.62) : steel.roughness;
        m.metalness = inside ? Math.min(steel.metalness, 0.7) : steel.metalness;
        m.envMapIntensity = inside ? 0.32 : steel.env;
        m.anisotropy = 0;
      }
      if (m.name === "interior_leather") {
        applyInteriorFinish(m, interior);
        if (model === "cybertruck") {
          m.roughness = 0.86;
          m.sheen = 0.08;
          m.envMapIntensity = 0.08;
        }
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
          const kind = m.userData.screen === "portrait" || m.userData.screen === "cluster"
            ? m.userData.screen
            : "landscape";
          applyDisplay(m, kind);
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
      if (
        o.name.startsWith("highland_") ||
        o.name.startsWith("cybertruck_cabin") ||
        o.name.startsWith("juniper_cabin") ||
        o.name.startsWith("cybercab_")
      )
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
    const paint = [...instance.materials.values()].find((m) => m.name === "exterior_paint");
    return attachCybercabDoorTrim(rig.body, {
      left: rig.door_fl,
      right: rig.door_fr,
      paint,
    });
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
