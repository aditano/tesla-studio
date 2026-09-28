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
        metalness: 0.12,
        roughness: 0.28,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
        envMapIntensity: 0.55,
        sheen: 0.22,
        sheenRoughness: 0.34,
        sheenColor: paint.flake ?? "#f4efe4",
        reflectivity: 0.64,
        iridescence: 0.2,
        iridescenceIOR: 1.28,
        iridescenceThicknessRange: [140, 320],
        ior: 1.5,
        specularIntensity: 1,
      };
    case "metallic":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.24,
        roughness: 0.32,
        clearcoat: 0.9,
        clearcoatRoughness: 0.11,
        envMapIntensity: 0.62,
        sheen: 0.12,
        sheenRoughness: 0.42,
        sheenColor: paint.flake ?? "#cfd8e3",
        reflectivity: 0.62,
        iridescence: 0.06,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 240],
        ior: 1.5,
        specularIntensity: 1,
      };
    default:
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.04,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.042,
        envMapIntensity: 0.96,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.56,
        ior: 1.5,
        specularIntensity: 1,
      };
  }
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

