import { useCursor } from "@react-three/drei";
import { type ThreeEvent } from "@react-three/fiber";
import { useState, type ReactNode } from "react";
import { vehicleById, type PartId } from "../catalog";
import { useStudio } from "../store";

export function Hotspot({
  id,
  children,
}: {
  id: PartId;
  children: ReactNode;
}) {
  const modelId = useStudio((s) => s.modelId);
  const toggle = useStudio((s) => s.togglePart);
  const setHover = useStudio((s) => s.setHover);
  const allowed = vehicleById(modelId).parts.includes(id);
  const [over, setOver] = useState(false);
  useCursor(over && allowed);

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!allowed) return;
    e.stopPropagation();
    setOver(true);
    setHover(id);
  };
  const onOut = () => {
    setOver(false);
    setHover(null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!allowed) return;
    e.stopPropagation();
    toggle(id);
  };

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      {children}
    </group>
  );
}
