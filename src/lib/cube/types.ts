export type FaceId = "U" | "D" | "F" | "B" | "L" | "R";

export type StickerColor = "W" | "Y" | "R" | "O" | "B" | "G";

export type FaceStickers = [
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
  StickerColor,
];

export type CubeStickers = Record<FaceId, FaceStickers>;

export type MoveToken =
  | "U"
  | "U'"
  | "U2"
  | "D"
  | "D'"
  | "D2"
  | "F"
  | "F'"
  | "F2"
  | "B"
  | "B'"
  | "B2"
  | "L"
  | "L'"
  | "L2"
  | "R"
  | "R'"
  | "R2";

export interface FaceMeta {
  id: FaceId;
  label: string;
  short: string;
  center: StickerColor;
  hint: string;
}

export const FACES: FaceMeta[] = [
  {
    id: "U",
    label: "Atas",
    short: "U",
    center: "W",
    hint: "Pusat putih di atas",
  },
  {
    id: "L",
    label: "Kiri",
    short: "L",
    center: "O",
    hint: "Pusat oranye di kiri",
  },
  {
    id: "F",
    label: "Depan",
    short: "F",
    center: "G",
    hint: "Pusat hijau di depan",
  },
  {
    id: "R",
    label: "Kanan",
    short: "R",
    center: "R",
    hint: "Pusat merah di kanan",
  },
  {
    id: "B",
    label: "Belakang",
    short: "B",
    center: "B",
    hint: "Pusat biru di belakang",
  },
  {
    id: "D",
    label: "Bawah",
    short: "D",
    center: "Y",
    hint: "Pusat kuning di bawah",
  },
];

export const COLOR_META: Record<
  StickerColor,
  { label: string; hex: string; face: FaceId; ink: string }
> = {
  W: { label: "Putih", hex: "#f3f6fb", face: "U", ink: "#1a2332" },
  Y: { label: "Kuning", hex: "#f0c92a", face: "D", ink: "#1a2332" },
  R: { label: "Merah", hex: "#de3b3b", face: "R", ink: "#fff8f6" },
  O: { label: "Oranye", hex: "#ef7a22", face: "L", ink: "#1a2332" },
  B: { label: "Biru", hex: "#2a62f0", face: "B", ink: "#f5f8ff" },
  G: { label: "Hijau", hex: "#28a85a", face: "F", ink: "#f4fff8" },
};

export const COLOR_ORDER: StickerColor[] = ["W", "Y", "R", "O", "G", "B"];

export function createSolvedCube(): CubeStickers {
  return {
    U: ["W", "W", "W", "W", "W", "W", "W", "W", "W"],
    D: ["Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y", "Y"],
    F: ["G", "G", "G", "G", "G", "G", "G", "G", "G"],
    B: ["B", "B", "B", "B", "B", "B", "B", "B", "B"],
    L: ["O", "O", "O", "O", "O", "O", "O", "O", "O"],
    R: ["R", "R", "R", "R", "R", "R", "R", "R", "R"],
  };
}
