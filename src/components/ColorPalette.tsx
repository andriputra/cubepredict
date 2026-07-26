"use client";

import { COLOR_META, COLOR_ORDER, type StickerColor } from "@/lib/cube/types";

interface ColorPaletteProps {
  selected: StickerColor;
  onSelect: (color: StickerColor) => void;
}

export function ColorPalette({ selected, onSelect }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {COLOR_ORDER.map((color) => {
        const meta = COLOR_META[color];
        const active = selected === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-white/10 bg-white/5 hover:border-white/25"
            }`}
            aria-pressed={active}
          >
            <span
              className="h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{ backgroundColor: meta.hex }}
            />
            <span className="text-xs text-[var(--ink-soft)]">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
