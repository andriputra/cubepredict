import {
  COLOR_META,
  createSolvedCube,
  type CubeStickers,
  type FaceId,
  type FaceStickers,
  type MoveToken,
  type StickerColor,
} from "./types";

export const FACE_ORDER: FaceId[] = ["U", "R", "F", "D", "L", "B"];

const FACE_TO_COLOR: Record<FaceId, StickerColor> = {
  U: "W",
  D: "Y",
  R: "R",
  L: "O",
  F: "G",
  B: "B",
};

export function cloneCube(cube: CubeStickers): CubeStickers {
  return {
    U: [...cube.U] as FaceStickers,
    R: [...cube.R] as FaceStickers,
    F: [...cube.F] as FaceStickers,
    D: [...cube.D] as FaceStickers,
    L: [...cube.L] as FaceStickers,
    B: [...cube.B] as FaceStickers,
  };
}

export function toFaceletString(cube: CubeStickers): string {
  return FACE_ORDER.map((face) =>
    cube[face].map((color) => COLOR_META[color].face).join(""),
  ).join("");
}

export function fromFaceletString(facelets: string): CubeStickers {
  const stickers = createSolvedCube();
  FACE_ORDER.forEach((face, faceIndex) => {
    const chunk = facelets.slice(faceIndex * 9, faceIndex * 9 + 9);
    stickers[face] = chunk
      .split("")
      .map((ch) => FACE_TO_COLOR[ch as FaceId]) as FaceStickers;
  });
  return stickers;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateCube(cube: CubeStickers): ValidationResult {
  const errors: string[] = [];
  const counts: Record<StickerColor, number> = {
    W: 0,
    Y: 0,
    R: 0,
    O: 0,
    B: 0,
    G: 0,
  };

  for (const face of FACE_ORDER) {
    const expected = FACE_TO_COLOR[face];
    if (cube[face][4] !== expected) {
      errors.push(
        `Pusat sisi ${face} harus ${COLOR_META[expected].label.toLowerCase()}.`,
      );
    }
    for (const sticker of cube[face]) {
      counts[sticker] += 1;
    }
  }

  (Object.keys(counts) as StickerColor[]).forEach((color) => {
    if (counts[color] !== 9) {
      errors.push(
        `Warna ${COLOR_META[color].label} harus tepat 9 stiker (saat ini ${counts[color]}).`,
      );
    }
  });

  return { ok: errors.length === 0, errors };
}

export function parseMoves(algorithm: string): MoveToken[] {
  return algorithm.trim().split(/\s+/).filter(Boolean) as MoveToken[];
}

export function describeMove(move: MoveToken): string {
  const face = move[0] as FaceId;
  const faceNames: Record<FaceId, string> = {
    U: "sisi atas",
    D: "sisi bawah",
    F: "sisi depan",
    B: "sisi belakang",
    L: "sisi kiri",
    R: "sisi kanan",
  };
  const suffix = move.slice(1);
  if (suffix === "2") return `Putar ${faceNames[face]} 180°`;
  if (suffix === "'") return `Putar ${faceNames[face]} 90° berlawanan jarum jam`;
  return `Putar ${faceNames[face]} 90° searah jarum jam`;
}

export function setSticker(
  cube: CubeStickers,
  face: FaceId,
  index: number,
  color: StickerColor,
): CubeStickers {
  if (index === 4) return cube;
  const next = cloneCube(cube);
  next[face][index] = color;
  return next;
}

export function fillFace(
  cube: CubeStickers,
  face: FaceId,
  color: StickerColor,
): CubeStickers {
  const next = cloneCube(cube);
  for (let i = 0; i < 9; i++) {
    if (i !== 4) next[face][i] = color;
  }
  return next;
}

export { createSolvedCube };
