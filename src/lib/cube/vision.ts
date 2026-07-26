import { COLOR_META, type StickerColor } from "@/lib/cube/types";

/** Fraction of the centered square covered by the 3×3 guide grid (must match overlay). */
export const GRID_FRACTION = 0.78;

/** Frames are downscaled to this size before sampling — big speedup vs full-res. */
const SAMPLE_SIZE = 216;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

/**
 * Rule-based classification over hue bands. More predictable than centroid
 * distance and much better at the red/orange boundary.
 */
export function classifyHsv({ h, s, v }: Hsv): StickerColor {
  // Very dark samples carry little color information; pick by hue anyway
  // but white needs decent brightness.
  if (s < 0.22 && v > 0.55) return "W";
  if (s < 0.14) return "W";

  if (h >= 340 || h < 14) return "R";
  if (h < 40) return "O";
  if (h < 78) return "Y";
  if (h < 170) return "G";
  if (h < 275) return "B";
  return "R"; // 275–340: magenta-ish reds under warm light
}

export function classifyRgb(rgb: Rgb): StickerColor {
  return classifyHsv(rgbToHsv(rgb));
}

function averageRgb(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) continue;
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / count, g: g / count, b: b / count };
}

/**
 * Gray-world white balance: assume the face average should be neutral and
 * compute per-channel gains. Corrects warm/cool lighting casts that push
 * white toward yellow and orange toward red.
 */
function grayWorldGains(samples: Rgb[]): [number, number, number] {
  let mr = 0;
  let mg = 0;
  let mb = 0;
  for (const s of samples) {
    mr += s.r;
    mg += s.g;
    mb += s.b;
  }
  mr /= samples.length;
  mg /= samples.length;
  mb /= samples.length;

  const mean = (mr + mg + mb) / 3;
  const clamp = (x: number) => Math.min(1.45, Math.max(0.65, x));
  return [
    clamp(mean / Math.max(1, mr)),
    clamp(mean / Math.max(1, mg)),
    clamp(mean / Math.max(1, mb)),
  ];
}

/**
 * Sample the 3×3 sticker grid from a video frame.
 * Samples only inside the guide-grid region (GRID_FRACTION of the centered
 * square) so results match exactly what the user aligns on screen.
 */
export function sampleFaceFromFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): { colors: StickerColor[]; rgbs: Rgb[] } {
  const fallback = {
    colors: Array(9).fill("W") as StickerColor[],
    rgbs: Array(9).fill({ r: 0, g: 0, b: 0 }) as Rgb[],
  };

  const size = Math.min(video.videoWidth, video.videoHeight);
  if (!size) return fallback;

  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;

  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;

  ctx.drawImage(video, sx, sy, size, size, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const image = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const gridSize = SAMPLE_SIZE * GRID_FRACTION;
  const offset = (SAMPLE_SIZE - gridSize) / 2;
  const cell = gridSize / 3;
  const radius = cell * 0.26;

  const raw: Rgb[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = offset + col * cell + cell / 2;
      const cy = offset + row * cell + cell / 2;
      raw.push(
        averageRgb(image.data, SAMPLE_SIZE, SAMPLE_SIZE, cx, cy, radius),
      );
    }
  }

  const [gr, gg, gb] = grayWorldGains(raw);
  const rgbs = raw.map(({ r, g, b }) => ({
    r: Math.min(255, Math.round(r * gr)),
    g: Math.min(255, Math.round(g * gg)),
    b: Math.min(255, Math.round(b * gb)),
  }));

  return { colors: rgbs.map(classifyRgb), rgbs };
}

export function colorHex(color: StickerColor): string {
  return COLOR_META[color].hex;
}
