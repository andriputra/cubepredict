import {
  COLOR_ORDER,
  createSolvedCube,
  type CubeStickers,
  type FaceId,
  type FaceStickers,
  type StickerColor,
} from "@/lib/cube/types";
import {
  classifyRgb,
  rgbToHsv,
  type Rgb,
} from "@/lib/cube/vision";

const FACE_ORDER: FaceId[] = ["U", "R", "F", "D", "L", "B"];

const CENTER_COLOR: Record<FaceId, StickerColor> = {
  U: "W",
  D: "Y",
  R: "R",
  L: "O",
  F: "G",
  B: "B",
};

/** Reference RGB targets after white-balance (approximate sticker paint). */
const TARGET_RGB: Record<StickerColor, Rgb> = {
  W: { r: 235, g: 238, b: 245 },
  Y: { r: 235, g: 200, b: 45 },
  R: { r: 210, g: 45, b: 45 },
  O: { r: 235, g: 120, b: 35 },
  G: { r: 40, g: 165, b: 85 },
  B: { r: 45, g: 95, b: 230 },
};

function colorDistance(a: Rgb, b: Rgb): number {
  const ah = rgbToHsv(a);
  const bh = rgbToHsv(b);
  const dh = Math.min(Math.abs(ah.h - bh.h), 360 - Math.abs(ah.h - bh.h)) / 180;
  const ds = Math.abs(ah.s - bh.s);
  const dv = Math.abs(ah.v - bh.v);
  const dr = (a.r - b.r) / 255;
  const dg = (a.g - b.g) / 255;
  const db = (a.b - b.b) / 255;
  return 1.2 * dh + 0.9 * ds + 0.7 * dv + 0.35 * (dr * dr + dg * dg + db * db);
}

/**
 * Softmax-style scores to all 6 Rubik colors for one RGB sample.
 */
export function scoreColors(rgb: Rgb): Record<StickerColor, number> {
  const scores = {} as Record<StickerColor, number>;
  for (const color of COLOR_ORDER) {
    const d = colorDistance(rgb, TARGET_RGB[color]);
    scores[color] = 1 / (0.08 + d);
  }
  return scores;
}

/**
 * AI-assisted face classification: score each sticker, then optionally
 * prefer diversity when two stickers are ambiguous.
 */
export function classifyFaceAi(rgbs: Rgb[], lockedCenter: StickerColor): FaceStickers {
  const colors = rgbs.map((rgb, i) =>
    i === 4 ? lockedCenter : classifyRgb(rgb),
  ) as StickerColor[];

  // Second pass: for non-center stickers, if top-2 scores are close, pick
  // the color that is currently under-represented on this face.
  const counts: Record<StickerColor, number> = {
    W: 0,
    Y: 0,
    R: 0,
    O: 0,
    B: 0,
    G: 0,
  };
  colors.forEach((c) => {
    counts[c] += 1;
  });

  for (let i = 0; i < 9; i++) {
    if (i === 4) continue;
    const scores = scoreColors(rgbs[i]);
    const ranked = COLOR_ORDER.map((c) => ({ c, s: scores[c] })).sort(
      (a, b) => b.s - a.s,
    );
    const best = ranked[0];
    const second = ranked[1];
    if (second && best.s / second.s < 1.12) {
      // Ambiguous: choose the less frequent color among the top 2.
      const pick =
        counts[best.c] <= counts[second.c] ? best.c : second.c;
      counts[colors[i]] -= 1;
      colors[i] = pick;
      counts[pick] += 1;
    } else {
      counts[colors[i]] -= 1;
      colors[i] = best.c;
      counts[best.c] += 1;
    }
  }

  colors[4] = lockedCenter;
  return colors as FaceStickers;
}

/**
 * Global rebalance: force exactly 9 stickers of each color while keeping
 * centers locked. Uses greedy assignment by confidence score.
 * This is the main on-device "AI correction" after a full camera scan.
 */
export function rebalanceCubeColors(cube: CubeStickers): CubeStickers {
  type Slot = {
    face: FaceId;
    index: number;
    rgbGuess: StickerColor;
    scores: Record<StickerColor, number>;
  };

  const next = createSolvedCube();
  // Copy centers first
  for (const face of FACE_ORDER) {
    next[face] = [...cube[face]] as FaceStickers;
    next[face][4] = CENTER_COLOR[face];
  }

  const slots: Slot[] = [];
  for (const face of FACE_ORDER) {
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      const guess = cube[face][i];
      // Approximate RGB from guessed color target (we may not have raw RGB here)
      const rgb = TARGET_RGB[guess];
      slots.push({
        face,
        index: i,
        rgbGuess: guess,
        scores: scoreColors(rgb),
      });
    }
  }

  // Remaining quota: 8 per color (centers already take 1 each)
  const remaining: Record<StickerColor, number> = {
    W: 8,
    Y: 8,
    R: 8,
    O: 8,
    B: 8,
    G: 8,
  };

  // Prefer keeping original guess when possible
  const assigned = new Set<string>();
  for (const slot of slots) {
    const key = `${slot.face}-${slot.index}`;
    if (remaining[slot.rgbGuess] > 0) {
      next[slot.face][slot.index] = slot.rgbGuess;
      remaining[slot.rgbGuess] -= 1;
      assigned.add(key);
    }
  }

  // Fill unresolved by best available score
  for (const slot of slots) {
    const key = `${slot.face}-${slot.index}`;
    if (assigned.has(key)) continue;
    const ranked = COLOR_ORDER.map((c) => ({ c, s: slot.scores[c] })).sort(
      (a, b) => b.s - a.s,
    );
    const pick = ranked.find((r) => remaining[r.c] > 0)?.c ?? "W";
    next[slot.face][slot.index] = pick;
    remaining[pick] -= 1;
    assigned.add(key);
  }

  return next;
}

/**
 * Rebalance using real RGB samples captured during scanning.
 * Prefer this when RGB history is available.
 */
export function rebalanceCubeFromSamples(
  samples: Partial<Record<FaceId, Rgb[]>>,
): CubeStickers {
  const cube = createSolvedCube();
  for (const face of FACE_ORDER) {
    const rgbs = samples[face];
    if (!rgbs || rgbs.length !== 9) {
      cube[face] = Array(9).fill(CENTER_COLOR[face]) as FaceStickers;
      cube[face][4] = CENTER_COLOR[face];
      continue;
    }
    cube[face] = classifyFaceAi(rgbs, CENTER_COLOR[face]);
  }

  type Slot = {
    face: FaceId;
    index: number;
    scores: Record<StickerColor, number>;
    best: StickerColor;
  };

  const slots: Slot[] = [];
  for (const face of FACE_ORDER) {
    const rgbs = samples[face];
    if (!rgbs) continue;
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      const scores = scoreColors(rgbs[i]);
      const best = COLOR_ORDER.reduce((a, b) =>
        scores[a] >= scores[b] ? a : b,
      );
      slots.push({ face, index: i, scores, best });
    }
  }

  const remaining: Record<StickerColor, number> = {
    W: 8,
    Y: 8,
    R: 8,
    O: 8,
    B: 8,
    G: 8,
  };

  // Sort by confidence (margin best vs second)
  slots.sort((a, b) => {
    const am = margin(a.scores);
    const bm = margin(b.scores);
    return bm - am;
  });

  const next = createSolvedCube();
  for (const face of FACE_ORDER) {
    next[face] = [...cube[face]] as FaceStickers;
    next[face][4] = CENTER_COLOR[face];
  }

  const filled = new Set<string>();
  for (const slot of slots) {
    const ranked = COLOR_ORDER.map((c) => ({ c, s: slot.scores[c] })).sort(
      (a, b) => b.s - a.s,
    );
    const pick = ranked.find((r) => remaining[r.c] > 0)?.c;
    if (!pick) continue;
    next[slot.face][slot.index] = pick;
    remaining[pick] -= 1;
    filled.add(`${slot.face}-${slot.index}`);
  }

  return next;
}

function margin(scores: Record<StickerColor, number>): number {
  const ranked = COLOR_ORDER.map((c) => scores[c]).sort((a, b) => b - a);
  return ranked[0] - (ranked[1] ?? 0);
}
