import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Finish, Interior, Paint } from "./catalog";

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
        roughness: 0.26,
        clearcoat: 0.08,
        clearcoatRoughness: 0.4,
        envMapIntensity: 1.36,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 1,
        anisotropy: 0.65,
        anisotropyRotation: 0,
        ior: 2.3,
        specularIntensity: 1,
      };
    case "satin":
      return {
        ...PAINT_DEFAULTS,
        color: paint.hex,
        metalness: 0.1,
        roughness: 0.5,
        clearcoat: 0.16,
        clearcoatRoughness: 0.52,
        envMapIntensity: 0.62,
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
        metalness: 0.1,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.038,
        envMapIntensity: 1.02,
        sheen: 0.52,
        sheenRoughness: 0.26,
        sheenColor: paint.flake ?? "#f4efe4",
        reflectivity: 0.68,
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
        metalness: 0.24,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.052,
        envMapIntensity: 1.08,
        sheen: 0.2,
        sheenRoughness: 0.36,
        sheenColor: paint.flake ?? "#cfd8e3",
        reflectivity: 0.64,
        iridescence: 0.07,
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
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.038,
        envMapIntensity: 1,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.58,
        ior: 1.5,
        specularIntensity: 1,
      };
  }
}

function applyPaint(p: PaintParams) {
  return new THREE.MeshPhysicalMaterial({
    color: p.color,
    metalness: p.metalness,
    roughness: p.roughness,
    clearcoat: p.clearcoat,
    clearcoatRoughness: p.clearcoatRoughness,
    envMapIntensity: p.envMapIntensity,
    sheen: p.sheen,
    sheenRoughness: p.sheenRoughness,
    sheenColor: new THREE.Color(p.sheenColor),
    reflectivity: p.reflectivity,
    anisotropy: p.anisotropy,
    anisotropyRotation: p.anisotropyRotation,
    iridescence: p.iridescence,
    iridescenceIOR: p.iridescenceIOR,
    iridescenceThicknessRange: p.iridescenceThicknessRange,
    ior: p.ior,
    specularIntensity: p.specularIntensity,
  });
}

export function usePaintMaterial(paint: Paint) {
  const material = useMemo(
    () => applyPaint(paintParams(paint)),
    [paint.hex, paint.finish, paint.flake],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
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

export function cabinGlassParams(tint = "#8fb4c8", opacity = 0.28) {
  return glassParams(tint, opacity, "cabin");
}

export function lampLensParams(tint = "#c5d4e2", opacity = 0.42) {
  return glassParams(tint, opacity, "lens");
}

export function useGlassMaterial(tint = "#8fb4c8", opacity = 0.28) {
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial(glassParams(tint, opacity, "cabin")),
    [tint, opacity],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function useLampLensMaterial(tint = "#c5d4e2", opacity = 0.42) {
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial(glassParams(tint, opacity, "lens")),
    [tint, opacity],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function upholsteryParams(interior: Interior) {
  return {
    leather: {
      color: interior.leather,
      roughness: 0.58,
      metalness: 0.02,
      sheen: 0.48,
      sheenRoughness: 0.5,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.5,
    },
    dash: {
      color: interior.dash,
      roughness: 0.7,
      metalness: 0.06,
    },
    plastic: {
      color: "#141416",
      roughness: 0.8,
      metalness: 0.03,
    },
  };
}

export function useInteriorMats(interior: Interior) {
  const materials = useMemo(() => {
    const u = upholsteryParams(interior);
    const leather = new THREE.MeshPhysicalMaterial({
      ...u.leather,
      sheenColor: new THREE.Color(interior.stitch),
    });
    const dash = new THREE.MeshStandardMaterial(u.dash);
    const plastic = new THREE.MeshStandardMaterial(u.plastic);
    return { leather, dash, plastic };
  }, [interior.dash, interior.leather, interior.stitch]);
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );
  return materials;
}

export const chrome = new THREE.MeshPhysicalMaterial({
  color: "#d8dee6",
  metalness: 1,
  roughness: 0.08,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  envMapIntensity: 1.25,
  anisotropy: 0.12,
  anisotropyRotation: 0,
});

export const darkTrim = new THREE.MeshStandardMaterial({
  color: "#0a0a0c",
  roughness: 0.34,
  metalness: 0.28,
});

export const rubber = new THREE.MeshStandardMaterial({
  color: "#0a0a0c",
  roughness: 0.92,
  metalness: 0,
});

export const emissiveWhite = (intensity: number) =>
  new THREE.MeshStandardMaterial({
    color: "#eef2fa",
    emissive: "#eef2fa",
    emissiveIntensity: intensity,
    roughness: 0.42,
    metalness: 0.08,
  });

export const emissiveRed = (intensity: number) =>
  new THREE.MeshStandardMaterial({
    color: "#ff2a2a",
    emissive: "#ff1d1d",
    emissiveIntensity: intensity,
    roughness: 0.46,
    metalness: 0.08,
  });

export function disposeMaterial(mat: THREE.Material | THREE.Material[]) {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

export function finishIsMatte(finish: Finish) {
  return finish === "satin" || finish === "stainless";
}
