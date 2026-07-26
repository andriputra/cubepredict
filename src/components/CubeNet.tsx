"use client";

import { FaceGrid } from "@/components/FaceGrid";
import type { CubeStickers, FaceId, StickerColor } from "@/lib/cube/types";
import { FACES } from "@/lib/cube/types";

interface CubeNetProps {
  cube: CubeStickers;
  selectedColor: StickerColor;
  activeFace: FaceId;
  onPaint: (face: FaceId, index: number) => void;
  onSelectFace: (face: FaceId) => void;
}

export function CubeNet({
  cube,
  selectedColor,
  activeFace,
  onPaint,
  onSelectFace,
}: CubeNetProps) {
  const faceMeta = Object.fromEntries(FACES.map((f) => [f.id, f])) as Record<
    FaceId,
    (typeof FACES)[number]
  >;

  const renderFace = (face: FaceId, size: "sm" | "md" = "sm") => (
    <div
      role="group"
      className="rounded-lg"
      onFocusCapture={() => onSelectFace(face)}
      onPointerDownCapture={() => onSelectFace(face)}
    >
      <FaceGrid
        face={face}
        stickers={cube[face]}
        selectedColor={selectedColor}
        onPaint={onPaint}
        size={size}
        highlight={activeFace === face}
        label={faceMeta[face].label}
      />
    </div>
  );

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="mx-auto grid w-max grid-cols-4 gap-3 sm:gap-4">
        <div className="col-start-2">{renderFace("U")}</div>
        <div className="col-start-1 row-start-2">{renderFace("L")}</div>
        <div className="col-start-2 row-start-2">{renderFace("F", "md")}</div>
        <div className="col-start-3 row-start-2">{renderFace("R")}</div>
        <div className="col-start-4 row-start-2">{renderFace("B")}</div>
        <div className="col-start-2 row-start-3">{renderFace("D")}</div>
      </div>
    </div>
  );
}
