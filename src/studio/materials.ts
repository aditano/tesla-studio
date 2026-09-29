import * as THREE from "three";
import type { Paint } from "./catalog";

export type PaintParams = {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: string;
  reflectivity: number;
  anisotropy: number;
  anisotropyRotation: number;
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  ior: number;
  specularIntensity: number;
};

export type GlassKind = "cabin" | "lens";

const PAINT_DEFAULTS = {
  anisotropy: 0,
  anisotropyRotation: 0,
  iridescence: 0,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400] as [number, number],
  ior: 1.5,
  specularIntensity: 1,
};

export function paintParams(paint: Paint): PaintParams {
  switch (paint.finish) {
    case "stainless":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 1,
        // Brushed steel: rough enough to blur the sky into a neutral sheen.
        // A mirror finish reflects only the (warm, tinted) backdrop and reads
        // as bronze on Mars and the desert.
        roughness: 0.36,
        clearcoat: 0,
        clearcoatRoughness: 0.42,
        envMapIntensity: 1.05,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.5,
        anisotropy: 0,
        anisotropyRotation: 0,
        ior: 1.5,
        specularIntensity: 1,
      };
    case "satin":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.1,
        roughness: 0.48,
        clearcoat: 0.14,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.68,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.34,
        ior: 1.45,
        specularIntensity: 0.72,
      };
    case "pearl":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.2,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 0.78,
        sheen: 0.36,
        sheenRoughness: 0.28,
        sheenColor: paint.flake ?? "#f4efe4",
        reflectivity: 0.7,
        iridescence: 0.22,
        iridescenceIOR: 1.28,
        iridescenceThicknessRange: [140, 320],
        ior: 1.5,
        specularIntensity: 1,
      };
    case "metallic":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.55,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        envMapIntensity: 0.86,
        sheen: 0.16,
        sheenRoughness: 0.38,
        sheenColor: paint.flake ?? "#cfd8e3",
        reflectivity: 0.68,
        iridescence: 0.08,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 240],
        ior: 1.5,
        specularIntensity: 1,
      };
    default:
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.06,
        roughness: 0.14,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.02,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.62,
        ior: 1.5,
        specularIntensity: 1,
      };
  }
}

/** The configurator writes this onto every body-paint material. */
export function applyExteriorPaint(
  material: THREE.MeshPhysicalMaterial,
  paint: Paint,
) {
  const p = paintParams(paint);
  material.color.set(p.color);
  material.metalness = p.metalness;
  material.roughness = p.roughness;
  material.clearcoat = p.clearcoat;
  material.clearcoatRoughness = p.clearcoatRoughness;
  material.envMapIntensity = p.envMapIntensity;
  material.sheen = p.sheen;
  material.sheenRoughness = p.sheenRoughness;
  material.sheenColor.set(p.sheenColor);
  material.reflectivity = p.reflectivity;
  material.iridescence = p.iridescence;
  material.iridescenceIOR = p.iridescenceIOR;
  material.iridescenceThicknessRange = [...p.iridescenceThicknessRange];
  material.ior = p.ior;
  material.specularIntensity = p.specularIntensity;
  material.anisotropy = 0;
  material.needsUpdate = true;
}

/** Brushed stainless, or a satin wrap when a Cybertruck color is selected. */
export function steelParams(paint: Paint) {
  if (paint.finish === "stainless") {
    return { color: "#d4d8de", roughness: 0.34, metalness: 0.96, env: 1.15 };
  }
  return { color: paint.hex, roughness: 0.46, metalness: 0.38, env: 0.72 };
}

export function applyInteriorFinish(
  material: THREE.MeshPhysicalMaterial,
  interior: { leather: string },
) {
  material.color.set(interior.leather);
  material.sheen = 0.42;
  material.sheenRoughness = 0.36;
  material.sheenColor.set(interior.leather);
  material.roughness = 0.58;
  material.metalness = 0;
  material.envMapIntensity = 0.32;
  material.needsUpdate = true;
}

export function glassParams(
  tint = "#8fb4c8",
  opacity = 0.28,
  kind: GlassKind = "cabin",
) {
  const lens = kind === "lens";
  return {
    color: tint,
    metalness: 0,
    roughness: lens ? 0.018 : 0.042,
    transparent: true,
    opacity,
    transmission: 0,
    thickness: 0,
    envMapIntensity: lens ? 1.7 : 1.32,
    clearcoat: 1,
    clearcoatRoughness: lens ? 0.012 : 0.028,
    reflectivity: lens ? 1 : 0.9,
    ior: lens ? 1.52 : 1.5,
    specularIntensity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  };
}

