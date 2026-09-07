import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Finish, Interior, Paint } from "./catalog";

export function paintParams(paint: Paint) {
  switch (paint.finish) {
    case "stainless":
      return {
        color: paint.hex,
        metalness: 1,
        roughness: 0.28,
        clearcoat: 0.12,
        clearcoatRoughness: 0.38,
        envMapIntensity: 1.45,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 1,
      };
    case "satin":
      return {
        color: paint.hex,
        metalness: 0.18,
        roughness: 0.48,
        clearcoat: 0.15,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.7,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.4,
      };
    case "pearl":
      return {
        color: paint.hex,
        metalness: 0.12,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.045,
        envMapIntensity: 1.05,
        sheen: 0.55,
        sheenRoughness: 0.28,
        sheenColor: paint.flake ?? "#ffffff",
        reflectivity: 0.7,
      };
    case "metallic":
      return {
        color: paint.hex,
        metalness: 0.22,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.1,
        sheen: 0.22,
        sheenRoughness: 0.38,
        sheenColor: paint.flake ?? "#cfd8e3",
        reflectivity: 0.65,
      };
    default:
      return {
        color: paint.hex,
        metalness: 0.08,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.05,
        sheen: 0,
        sheenRoughness: 1,
        sheenColor: "#000000",
        reflectivity: 0.6,
      };
  }
}

export function usePaintMaterial(paint: Paint) {
  const p = paintParams(paint);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
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
      }),
    [
      p.color,
      p.metalness,
      p.roughness,
      p.clearcoat,
      p.clearcoatRoughness,
      p.envMapIntensity,
      p.sheen,
      p.sheenRoughness,
      p.sheenColor,
      p.reflectivity,
    ],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function useGlassMaterial(tint = "#8fb4c8", opacity = 0.28) {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: tint,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity,
        transmission: 0,
        thickness: 0,

        envMapIntensity: 1.4,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        reflectivity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [tint, opacity],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function useInteriorMats(interior: Interior) {
  const materials = useMemo(() => {
    const leather = new THREE.MeshPhysicalMaterial({
      color: interior.leather,
      roughness: 0.62,
      metalness: 0.04,
      sheen: 0.35,
      sheenColor: new THREE.Color(interior.stitch),
      sheenRoughness: 0.55,
    });
    const dash = new THREE.MeshStandardMaterial({
      color: interior.dash,
      roughness: 0.55,
      metalness: 0.12,
    });
    const plastic = new THREE.MeshStandardMaterial({
      color: "#141416",
      roughness: 0.7,
      metalness: 0.05,
    });
    return { leather, dash, plastic };
  }, [interior.dash, interior.leather, interior.stitch]);
  useEffect(
    () => () => Object.values(materials).forEach((m) => m.dispose()),
    [materials],
  );
  return materials;
}

export const chrome = new THREE.MeshPhysicalMaterial({
  color: "#dfe4ea",
  metalness: 1,
  roughness: 0.12,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
});

export const darkTrim = new THREE.MeshStandardMaterial({
  color: "#09090b",
  roughness: 0.45,
  metalness: 0.4,
});

export const rubber = new THREE.MeshStandardMaterial({
  color: "#0d0d0f",
  roughness: 0.72,
  metalness: 0.05,
});

export const emissiveWhite = (intensity: number) =>
  new THREE.MeshStandardMaterial({
    color: "#f4f7ff",
    emissive: "#f4f7ff",
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.1,
  });

export const emissiveRed = (intensity: number) =>
  new THREE.MeshStandardMaterial({
    color: "#ff2a2a",
    emissive: "#ff1d1d",
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.1,
  });

export function disposeMaterial(mat: THREE.Material | THREE.Material[]) {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

export function finishIsMatte(finish: Finish) {
  return finish === "satin" || finish === "stainless";
}
