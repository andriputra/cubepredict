"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { classifyFaceAi, rebalanceCubeFromSamples } from "@/lib/ai/vision";
import {
  COLOR_META,
  FACES,
  type CubeStickers,
  type FaceId,
  type FaceStickers,
  type StickerColor,
} from "@/lib/cube/types";
import {
  GRID_FRACTION,
  colorHex,
  sampleFaceFromFrame,
  type Rgb,
} from "@/lib/cube/vision";

const SCAN_ORDER: FaceId[] = ["U", "R", "F", "D", "L", "B"];
const SAMPLE_INTERVAL_MS = 100;
const HISTORY_LENGTH = 6;

function majority(samples: StickerColor[]): StickerColor {
  const counts = new Map<StickerColor, number>();
  let best: StickerColor = samples[samples.length - 1] ?? "W";
  let bestCount = 0;
  for (const color of samples) {
    const next = (counts.get(color) ?? 0) + 1;
    counts.set(color, next);
    if (next > bestCount) {
      bestCount = next;
      best = color;
    }
  }
  return best;
}

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onApplyFace: (face: FaceId, stickers: FaceStickers) => void;
  /** Called after all faces captured; may include AI-rebalanced cube. */
  onComplete: (result: {
    cube: CubeStickers;
    source: "local-ai" | "openai";
  }) => void;
}

export function CameraScanner({
  open,
  onClose,
  onApplyFace,
  onComplete,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historyRef = useRef<StickerColor[][]>(
    Array.from({ length: 9 }, () => []),
  );
  const latestRgbRef = useRef<Rgb[] | null>(null);
  const samplesRef = useRef<Partial<Record<FaceId, Rgb[]>>>({});

  const [faceIndex, setFaceIndex] = useState(0);
  const [preview, setPreview] = useState<StickerColor[]>(Array(9).fill("W"));
  const [stable, setStable] = useState(false);
  const [captured, setCaptured] = useState<Partial<Record<FaceId, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [aiMode, setAiMode] = useState<"local-ai" | "openai">("local-ai");

  const currentFace = SCAN_ORDER[faceIndex];
  const faceMeta = FACES.find((f) => f.id === currentFace)!;

  const resetHistory = useCallback(() => {
    historyRef.current = Array.from({ length: 9 }, () => []);
    setStable(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setFaceIndex(0);
    setCaptured({});
    samplesRef.current = {};
    setAiMode("local-ai");
    resetHistory();

    async function start() {
      setError(null);
      setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
      } catch {
        setError(
          "Kamera tidak bisa diakses. Izinkan permission kamera di browser, atau gunakan input manual.",
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, resetHistory]);

  useEffect(() => {
    resetHistory();
  }, [faceIndex, resetHistory]);

  useEffect(() => {
    if (!open || !ready) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const { rgbs } = sampleFaceFromFrame(video, canvas);
      latestRgbRef.current = rgbs;
      const aiColors = classifyFaceAi(rgbs, faceMeta.center);

      const history = historyRef.current;
      aiColors.forEach((color, i) => {
        history[i].push(color);
        if (history[i].length > HISTORY_LENGTH) history[i].shift();
      });

      const smoothed = history.map(majority);
      smoothed[4] = faceMeta.center;
      setPreview(smoothed);
      setStable(history[0].length >= Math.min(4, HISTORY_LENGTH));
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [open, ready, faceMeta.center]);

  if (!open) return null;

  const finishScan = (source: "local-ai" | "openai") => {
    const cube = rebalanceCubeFromSamples(samplesRef.current);
    onComplete({ cube, source });
    onClose();
  };

  const captureFace = async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      let stickers = [...preview] as FaceStickers;
      stickers[4] = faceMeta.center;
      let source: "local-ai" | "openai" = aiMode;

      const rgbs = latestRgbRef.current;
      if (rgbs) {
        stickers = classifyFaceAi(rgbs, faceMeta.center);
        samplesRef.current[currentFace] = rgbs;
      }

      // Optional cloud vision refine when OPENAI_API_KEY is configured.
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
          const res = await fetch("/api/ai/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64,
              center: faceMeta.center,
              face: currentFace,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              colors?: StickerColor[];
              source?: string;
            };
            if (data.colors?.length === 9) {
              stickers = data.colors as FaceStickers;
              stickers[4] = faceMeta.center;
              source = "openai";
              setAiMode("openai");
            }
          }
        } catch {
          // Keep on-device AI result.
        }
      }

      setPreview(stickers);
      onApplyFace(currentFace, stickers);
      setCaptured((prev) => ({ ...prev, [currentFace]: true }));

      if (faceIndex < SCAN_ORDER.length - 1) {
        setFaceIndex((i) => i + 1);
      } else {
        finishScan(source);
      }
    } finally {
      setCapturing(false);
    }
  };

  const goPrev = () => setFaceIndex((i) => Math.max(0, i - 1));
  const goNext = () => setFaceIndex((i) => Math.min(SCAN_ORDER.length - 1, i + 1));
  const gridPercent = `${GRID_FRACTION * 100}%`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="panel max-h-[95vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Scan kamera · AI</p>
            <h2 className="font-display mt-1 text-2xl text-[var(--ink)]">
              Sisi {faceMeta.label} ({currentFace})
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Arahkan sisi {faceMeta.label.toLowerCase()} ke kamera. Deteksi
              memakai AI on-device
              {aiMode === "openai" ? " + OpenAI Vision" : ""}
              . Pusat harus {COLOR_META[faceMeta.center].label.toLowerCase()}.
            </p>
          </div>
          <button type="button" className="btn-secondary !px-3 !py-2" onClick={onClose}>
            Tutup
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div
                  className="relative"
                  style={{ width: gridPercent, height: gridPercent }}
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5">
                    {preview.map((color, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-white/60"
                        style={{
                          boxShadow: `inset 0 0 0 3px ${colorHex(color)}aa`,
                          background:
                            i === 4 ? `${colorHex(faceMeta.center)}33` : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className={`absolute inset-0 rounded-lg border-2 transition-colors ${
                      stable ? "border-[var(--accent)]" : "border-white/50"
                    }`}
                  />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  AI deteksi {stable ? "· stabil" : "· menstabilkan…"}
                  {capturing ? " · memproses…" : ""}
                </p>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[var(--panel-deep)] p-2">
                  {preview.map((color, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md"
                      style={{
                        background: colorHex(i === 4 ? faceMeta.center : color),
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
                      }}
                      title={COLOR_META[i === 4 ? faceMeta.center : color].label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {SCAN_ORDER.map((face, index) => {
                  const meta = FACES.find((f) => f.id === face)!;
                  const done = Boolean(captured[face]);
                  const active = index === faceIndex;
                  return (
                    <button
                      key={face}
                      type="button"
                      onClick={() => setFaceIndex(index)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                          : done
                            ? "border-white/20 text-[var(--accent)]"
                            : "border-white/10 text-[var(--muted)]"
                      }`}
                    >
                      {meta.short}
                      {done ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-[var(--muted)]">
                AI on-device mengklasifikasi warna + menyeimbangkan 9 stiker per
                warna di akhir scan. Jika `OPENAI_API_KEY` ada, tiap sisi bisa
                diverifikasi OpenAI Vision.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={goPrev}
                  disabled={faceIndex === 0 || capturing}
                >
                  Sisi sebelumnya
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void captureFace()}
                  disabled={capturing}
                >
                  {capturing
                    ? "AI memproses…"
                    : faceIndex === SCAN_ORDER.length - 1
                      ? "Capture & selesai"
                      : "Capture sisi ini"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={goNext}
                  disabled={faceIndex === SCAN_ORDER.length - 1 || capturing}
                >
                  Lewati
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
