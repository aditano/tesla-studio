import type { Backdrop } from "./backdrops";

export type SkyStop = { t: number; color: string };

/** Four atmospheric stops. The renderer paints these; a flat sky is one colour. */
export function skyStops(backdrop: Backdrop): SkyStop[] {
  switch (backdrop.id) {
    case "daylight":
      return [
        { t: 0, color: "#6eabe2" },
        { t: 0.42, color: "#b7d4ec" },
        { t: 0.7, color: "#f3e2c8" },
        { t: 1, color: "#d9c7aa" },
      ];
    case "mars":
      return [
        { t: 0, color: "#c49078" },
        { t: 0.4, color: "#d7a088" },
        { t: 0.68, color: "#e8b498" },
        { t: 1, color: "#684034" },
      ];
    case "desert":
      return [
        { t: 0, color: "#9ec8e8" },
        { t: 0.38, color: "#f4e2bc" },
        { t: 0.66, color: "#ffe6c4" },
        { t: 1, color: "#e2c090" },
      ];
    case "forest":
      return [
        { t: 0, color: "#8eb4cc" },
        { t: 0.4, color: "#c5d8c4" },
        { t: 0.68, color: "#dce8cf" },
        { t: 1, color: "#24382e" },
      ];
    case "night-city":
      return [
        { t: 0, color: "#07091a" },
        { t: 0.35, color: "#1a2048" },
        { t: 0.62, color: "#3a2860" },
        { t: 1, color: "#120818" },
      ];
    case "midnight":
      return [
        { t: 0, color: "#0c1220" },
        { t: 0.45, color: "#1a2740" },
        { t: 0.72, color: "#243044" },
        { t: 1, color: "#05070a" },
      ];
    default:
      return [
        { t: 0, color: backdrop.skyTop },
        { t: 0.4, color: "#24303c" },
        { t: 0.7, color: "#3a4654" },
        { t: 1, color: backdrop.skyBottom },
      ];
  }
}

function parseHex(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Vertical atmosphere plus a sun or stars, into an RGBA buffer (top = y 0). */
export function paintSky(
  backdrop: Backdrop,
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const stops = skyStops(backdrop).map((stop) => ({ ...stop, rgb: parseHex(stop.color) }));
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].t && t <= stops[i + 1].t) {
        a = stops[i];
        b = stops[i + 1];
        break;
      }
    }
    const span = Math.max(1e-4, b.t - a.t);
    const u = Math.min(1, Math.max(0, (t - a.t) / span));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = a.rgb[0] + (b.rgb[0] - a.rgb[0]) * u;
      data[i + 1] = a.rgb[1] + (b.rgb[1] - a.rgb[1]) * u;
      data[i + 2] = a.rgb[2] + (b.rgb[2] - a.rgb[2]) * u;
      data[i + 3] = 255;
    }
  }
  if (backdrop.day) {
    const sunX = backdrop.id === "mars" ? Math.floor(width * 0.72) : Math.floor(width * 0.28);
    const sunY = backdrop.id === "desert" ? Math.floor(height * 0.22) : Math.floor(height * 0.34);
    const radius = Math.floor(Math.min(width, height) * 0.16);
    for (let y = sunY - radius; y <= sunY + radius; y++) {
      if (y < 0 || y >= height) continue;
      for (let x = sunX - radius; x <= sunX + radius; x++) {
        if (x < 0 || x >= width) continue;
        const d = Math.hypot(x - sunX, y - sunY) / radius;
        if (d > 1) continue;
        const glow = (1 - d) * (1 - d);
        const i = (y * width + x) * 4;
        data[i] = Math.min(255, data[i] + 255 * glow);
        data[i + 1] = Math.min(255, data[i + 1] + 220 * glow);
        data[i + 2] = Math.min(255, data[i + 2] + 170 * glow);
      }
    }
  }
  if (backdrop.night) {
    let seed = backdrop.id.length * 13;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let n = 0; n < 80; n++) {
      const x = Math.floor(rnd() * width);
      const y = Math.floor(rnd() * height * 0.62);
      const i = (y * width + x) * 4;
      const v = 180 + Math.floor(rnd() * 75);
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
}
