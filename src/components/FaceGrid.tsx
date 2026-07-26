"use client";

import { COLOR_META, type FaceId, type FaceStickers, type StickerColor } from "@/lib/cube/types";

interface FaceGridProps {
  face: FaceId;
  stickers: FaceStickers;
  selectedColor: StickerColor;
  onPaint: (face: FaceId, index: number) => void;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  highlight?: boolean;
  label?: string;
}

const sizeMap = {
  sm: "h-7 w-7 sm:h-8 sm:w-8",
  md: "h-9 w-9 sm:h-10 sm:w-10",
  lg: "h-11 w-11 sm:h-12 sm:w-12",
};

export function FaceGrid({
  face,
  stickers,
  selectedColor,
  onPaint,
  size = "md",
  interactive = true,
  highlight = false,
  label,
}: FaceGridProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 ${highlight ? "scale-[1.02]" : ""}`}
    >
      {label ? (
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm tracking-wide text-[var(--ink)]">
            {label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {face}
          </span>
        </div>
      ) : null}
      <div
        className={`grid grid-cols-3 gap-1 rounded-md bg-[var(--panel-deep)] p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] ${
          highlight ? "ring-2 ring-[var(--accent)]" : ""
        }`}
      >
        {stickers.map((color, index) => {
          const locked = index === 4;
          const meta = COLOR_META[color];
          return (
            <button
              key={`${face}-${index}`}
              type="button"
              disabled={!interactive || locked}
              aria-label={`${face} stiker ${index + 1}, ${meta.label}`}
              onClick={() => onPaint(face, index)}
              className={`${sizeMap[size]} rounded-[4px] transition duration-150 ${
                interactive && !locked
                  ? "cursor-pointer hover:brightness-110 active:scale-95"
                  : locked
                    ? "cursor-default"
                    : "cursor-default"
              }`}
              style={{
                backgroundColor: meta.hex,
                boxShadow:
                  "inset 0 0 0 1px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.18)",
              }}
              title={locked ? "Pusat terkunci" : `Cat dengan ${COLOR_META[selectedColor].label}`}
            />
          );
        })}
      </div>
    </div>
  );
}
