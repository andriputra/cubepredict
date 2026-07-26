"use client";

import { useEffect, useState } from "react";
import {
  clearMemories,
  deleteMemory,
  listMemories,
  sourceLabel,
  type CubeMemory,
} from "@/lib/cube/memory";
import { COLOR_META, type FaceId } from "@/lib/cube/types";

interface MemoryPanelProps {
  refreshKey: number;
  onLoad: (memory: CubeMemory) => void;
}

export function MemoryPanel({ refreshKey, onLoad }: MemoryPanelProps) {
  const [items, setItems] = useState<CubeMemory[]>([]);

  useEffect(() => {
    setItems(listMemories());
  }, [refreshKey]);

  if (items.length === 0) {
    return (
      <div className="panel p-5 sm:p-6">
        <p className="eyebrow">Memory penyelesaian</p>
        <h3 className="font-display mt-1 text-xl text-[var(--ink)]">Belum ada memory</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Setelah prediksi berhasil (manual atau kamera), solusi akan otomatis
          tersimpan di perangkat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Memory penyelesaian</p>
          <h3 className="font-display mt-1 text-xl text-[var(--ink)]">
            Riwayat tersimpan
          </h3>
        </div>
        <button
          type="button"
          className="btn-secondary !px-3 !py-2 text-xs"
          onClick={() => {
            clearMemories();
            setItems([]);
          }}
        >
          Hapus semua
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--ink)]">{item.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {sourceLabel(item.source)} · {item.moveCount} gerakan ·{" "}
                  {new Date(item.updatedAt).toLocaleString("id-ID")}
                </p>
              </div>
              <MiniNet stickers={item.stickers} />
            </div>
            <p className="mt-3 font-mono text-[11px] leading-5 text-[var(--ink-soft)] break-words">
              {item.algorithm || "(sudah solved)"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary !px-3 !py-2 text-xs"
                onClick={() => onLoad(item)}
              >
                Muat & putar ulang
              </button>
              <button
                type="button"
                className="btn-secondary !px-3 !py-2 text-xs"
                onClick={() => {
                  deleteMemory(item.id);
                  setItems(listMemories());
                }}
              >
                Hapus
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniNet({ stickers }: { stickers: CubeMemory["stickers"] }) {
  const faces: FaceId[] = ["U", "F", "R"];
  return (
    <div className="flex gap-1.5">
      {faces.map((face) => (
        <div key={face} className="grid grid-cols-3 gap-0.5 rounded bg-black/40 p-0.5">
          {stickers[face].map((color, i) => (
            <div
              key={`${face}-${i}`}
              className="h-2.5 w-2.5 rounded-[1px]"
              style={{ background: COLOR_META[color].hex }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
