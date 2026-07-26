"use client";

import { useMemo, useState } from "react";
import { CameraScanner } from "@/components/CameraScanner";
import { ColorPalette } from "@/components/ColorPalette";
import { Cube3D } from "@/components/Cube3D";
import { CubeNet } from "@/components/CubeNet";
import { FaceGrid } from "@/components/FaceGrid";
import { MemoryPanel } from "@/components/MemoryPanel";
import { SolutionPlayer } from "@/components/SolutionPlayer";
import { setSticker, validateCube } from "@/lib/cube/engine";
import { saveMemory, type MemorySource } from "@/lib/cube/memory";
import { scrambleStickers, solveCube } from "@/lib/cube/solver";
import {
  createSolvedCube,
  FACES,
  type CubeStickers,
  type FaceId,
  type FaceStickers,
  type MoveToken,
  type StickerColor,
} from "@/lib/cube/types";

type Stage = "input" | "solving" | "solution";

export function CubePredictApp() {
  const [cube, setCube] = useState<CubeStickers>(() => createSolvedCube());
  const [selectedColor, setSelectedColor] = useState<StickerColor>("R");
  const [activeFace, setActiveFace] = useState<FaceId>("F");
  const [stage, setStage] = useState<Stage>("input");
  const [errors, setErrors] = useState<string[]>([]);
  const [moves, setMoves] = useState<MoveToken[]>([]);
  const [algorithm, setAlgorithm] = useState("");
  const [startSnapshot, setStartSnapshot] = useState<CubeStickers | null>(null);
  const [solving, setSolving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [inputSource, setInputSource] = useState<MemorySource>("manual");
  const [memoryKey, setMemoryKey] = useState(0);
  const [lastMemoryId, setLastMemoryId] = useState<string | null>(null);

  const validation = useMemo(() => validateCube(cube), [cube]);

  const paint = (face: FaceId, index: number) => {
    setActiveFace(face);
    setInputSource((prev) => (prev === "camera" ? "camera" : "manual"));
    setCube((prev) => setSticker(prev, face, index, selectedColor));
    setErrors([]);
  };

  const applyScannedFace = (face: FaceId, stickers: FaceStickers) => {
    setInputSource("camera");
    setActiveFace(face);
    setCube((prev) => ({ ...prev, [face]: stickers }));
    setErrors([]);
  };

  const persistSolution = (
    snapshot: CubeStickers,
    nextMoves: MoveToken[],
    nextAlgorithm: string,
    source: MemorySource,
  ) => {
    const memory = saveMemory({
      id: lastMemoryId ?? undefined,
      label: "",
      source,
      stickers: snapshot,
      algorithm: nextAlgorithm,
      moves: nextMoves,
    });
    setLastMemoryId(memory.id);
    setMemoryKey((k) => k + 1);
  };

  const handleSolve = async () => {
    setErrors([]);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setSolving(true);
    setStage("solving");
    const snapshot = cube;
    const source = inputSource;

    try {
      const result = await solveCube(snapshot);
      if (!result.ok) {
        setErrors(result.errors);
        setStage("input");
        return;
      }
      setStartSnapshot(snapshot);
      setMoves(result.moves);
      setAlgorithm(result.algorithm);
      setStage("solution");
      persistSolution(snapshot, result.moves, result.algorithm, source);
    } finally {
      setSolving(false);
    }
  };

  const loadMemory = (memory: {
    id: string;
    stickers: CubeStickers;
    moves: MoveToken[];
    algorithm: string;
    source: MemorySource;
  }) => {
    setCube(memory.stickers);
    setStartSnapshot(memory.stickers);
    setMoves(memory.moves);
    setAlgorithm(memory.algorithm);
    setInputSource(memory.source);
    setLastMemoryId(memory.id);
    setErrors([]);
    setStage("solution");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="atmosphere" aria-hidden />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] font-display text-sm font-bold text-[#081018]">
            CP
          </div>
          <div>
            <p className="font-display text-lg leading-none tracking-tight text-[var(--ink)]">
              CubePredict
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Rubik solver
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#memory"
            className="hidden text-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)] sm:inline"
          >
            Memory
          </a>
          <a
            href="#workspace"
            className="hidden text-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)] sm:inline"
          >
            Mulai prediksi
          </a>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        {stage !== "solution" ? (
          <section className="hero-section grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-14 lg:pt-10">
            <div>
              <p className="eyebrow">Prediksi penyelesaian Rubik</p>
              <h1 className="font-display mt-3 max-w-xl text-5xl leading-[0.95] tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl">
                CubePredict
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
                Scan warna lewat kamera atau cat manual, lalu dapatkan solusi
                step-by-step. Setiap prediksi tersimpan sebagai memory di
                perangkatmu.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCameraOpen(true)}
                >
                  Scan kamera
                </button>
                <a href="#workspace" className="btn-secondary">
                  Input manual
                </a>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setCube(scrambleStickers());
                    setInputSource("scramble");
                    setLastMemoryId(null);
                    setErrors([]);
                    setStage("input");
                  }}
                >
                  Coba acak
                </button>
              </div>
            </div>
            <div className="panel overflow-hidden p-4 sm:p-6">
              <Cube3D cube={cube} size={240} />
            </div>
          </section>
        ) : null}

        <section id="workspace" className="scroll-mt-8">
          {stage === "solving" || solving ? (
            <div className="panel grid min-h-[360px] place-items-center p-10 text-center">
              <div>
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-[var(--accent)]" />
                <p className="font-display mt-6 text-2xl text-[var(--ink)]">
                  Menghitung solusi…
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Engine Kociemba menyiapkan tabel pencarian, lalu menyelesaikan
                  konfigurasi rubikmu.
                </p>
              </div>
            </div>
          ) : null}

          {stage === "solution" && startSnapshot ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                Solusi tersimpan ke memory perangkat
                {inputSource === "camera" ? " (sumber: kamera)" : ""}.
              </div>
              <SolutionPlayer
                start={startSnapshot}
                moves={moves}
                algorithm={algorithm}
                onReset={() => {
                  setStage("input");
                  setMoves([]);
                  setAlgorithm("");
                  setStartSnapshot(null);
                }}
              />
            </div>
          ) : null}

          {stage === "input" ? (
            <div className="space-y-6">
              <div className="panel p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="eyebrow">Langkah 1</p>
                    <h2 className="font-display mt-1 text-2xl text-[var(--ink)] sm:text-3xl">
                      Scan kamera atau cat warna
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                      Orientasikan rubik: putih di atas, hijau di depan. Scan
                      tiap sisi lewat kamera, atau koreksi manual. Pusat tiap
                      sisi terkunci sesuai orientasi.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setCameraOpen(true)}
                    >
                      Buka kamera
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setCube(createSolvedCube());
                        setInputSource("manual");
                        setLastMemoryId(null);
                      }}
                    >
                      Reset solved
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setCube(scrambleStickers());
                        setInputSource("scramble");
                        setLastMemoryId(null);
                      }}
                    >
                      Acak
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    Palet koreksi manual
                  </p>
                  <ColorPalette selected={selectedColor} onSelect={setSelectedColor} />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="panel p-5 sm:p-6">
                  <p className="eyebrow mb-4">Net rubik</p>
                  <CubeNet
                    cube={cube}
                    selectedColor={selectedColor}
                    activeFace={activeFace}
                    onPaint={paint}
                    onSelectFace={setActiveFace}
                  />
                </div>

                <div className="space-y-6">
                  <div className="panel p-5 sm:p-6">
                    <p className="eyebrow mb-4">Editor sisi aktif</p>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {FACES.map((face) => (
                        <button
                          key={face.id}
                          type="button"
                          onClick={() => setActiveFace(face.id)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            activeFace === face.id
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                              : "border-white/10 text-[var(--muted)] hover:border-white/25"
                          }`}
                        >
                          {face.label}
                        </button>
                      ))}
                    </div>
                    <FaceGrid
                      face={activeFace}
                      stickers={cube[activeFace]}
                      selectedColor={selectedColor}
                      onPaint={paint}
                      size="lg"
                      label={FACES.find((f) => f.id === activeFace)?.label}
                    />
                    <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
                      {FACES.find((f) => f.id === activeFace)?.hint}
                    </p>
                  </div>

                  <div className="panel p-5 sm:p-6">
                    <p className="eyebrow mb-3">Preview 3D</p>
                    <Cube3D cube={cube} size={200} />
                  </div>
                </div>
              </div>

              {errors.length > 0 ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                  <p className="font-medium">Perlu diperbaiki:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--muted)]">
                  {validation.ok
                    ? "Konfigurasi warna siap diprediksi dan disimpan ke memory."
                    : "Lengkapi / koreksi warna hingga tiap warna tepat 9 stiker."}
                </p>
                <button type="button" className="btn-primary" onClick={handleSolve}>
                  Prediksi & simpan
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section id="memory" className="mt-10 scroll-mt-8">
          <MemoryPanel
            refreshKey={memoryKey}
            onLoad={(memory) => loadMemory(memory)}
          />
        </section>
      </main>

      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onApplyFace={applyScannedFace}
        onComplete={() => {
          setInputSource("camera");
          setLastMemoryId(null);
        }}
      />
    </div>
  );
}
