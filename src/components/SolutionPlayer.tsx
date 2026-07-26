"use client";

import { useEffect, useMemo, useState } from "react";
import { Cube3D } from "@/components/Cube3D";
import { describeMove } from "@/lib/cube/engine";
import { statesAlongSolution } from "@/lib/cube/solver";
import type { CubeStickers, MoveToken } from "@/lib/cube/types";

interface SolutionPlayerProps {
  start: CubeStickers;
  moves: MoveToken[];
  algorithm: string;
  onReset: () => void;
}

export function SolutionPlayer({
  start,
  moves,
  algorithm,
  onReset,
}: SolutionPlayerProps) {
  const states = useMemo(() => statesAlongSolution(start, moves), [start, moves]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [animating, setAnimating] = useState(false);

  const total = moves.length;
  const currentMove = step < total ? moves[step] : null;
  const displayCube = states[step];

  useEffect(() => {
    if (!playing || step >= total) {
      if (step >= total) setPlaying(false);
      return;
    }

    setAnimating(true);
    const timer = setTimeout(() => {
      setStep((s) => Math.min(s + 1, total));
      setAnimating(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [playing, step, total]);

  const goTo = (next: number) => {
    setPlaying(false);
    setAnimating(false);
    setStep(Math.max(0, Math.min(next, total)));
  };

  if (total === 0) {
    return (
      <div className="space-y-6 text-center">
        <Cube3D cube={start} />
        <div>
          <p className="font-display text-2xl text-[var(--ink)]">Rubik sudah selesai</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tidak ada gerakan yang diperlukan.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onReset}>
          Input ulang
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="panel relative overflow-hidden p-5 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Visualisasi langkah</p>
            <h2 className="font-display text-2xl text-[var(--ink)] sm:text-3xl">
              {step === 0
                ? "Posisi awal"
                : step === total
                  ? "Selesai"
                  : `Langkah ${step + 1} / ${total}`}
            </h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-[var(--accent)]">
            {total} moves
          </div>
        </div>

        <Cube3D
          cube={displayCube}
          activeMove={currentMove}
          animating={animating && playing}
        />

        <div className="mt-6 rounded-2xl border border-white/8 bg-[var(--panel-deep)] p-4 text-center">
          {step < total ? (
            <>
              <p className="font-mono text-4xl font-semibold tracking-tight text-[var(--accent)] sm:text-5xl">
                {moves[step]}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {describeMove(moves[step])}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl text-[var(--ink)]">Cube solved</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Semua stiker sudah kembali ke posisi benar.
              </p>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => goTo(0)}>
            Awal
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (step >= total) {
                setStep(0);
                setPlaying(true);
              } else {
                setPlaying((p) => !p);
              }
            }}
          >
            {playing ? "Pause" : step >= total ? "Putar ulang" : "Play"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => goTo(step + 1)}
            disabled={step >= total}
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel p-5 sm:p-6">
          <p className="eyebrow">Algoritma</p>
          <p className="mt-2 font-mono text-sm leading-7 text-[var(--ink-soft)] break-words">
            {algorithm}
          </p>
        </div>

        <div className="panel max-h-[420px] overflow-y-auto p-4 sm:p-5">
          <p className="eyebrow mb-3">Timeline</p>
          <ol className="space-y-2">
            {moves.map((move, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <li key={`${move}-${index}`}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : done
                          ? "border-white/8 bg-white/[0.03] opacity-70"
                          : "border-white/8 bg-transparent hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="w-8 font-mono text-xs text-[var(--muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="w-12 font-mono text-base font-semibold text-[var(--accent)]">
                      {move}
                    </span>
                    <span className="text-sm text-[var(--ink-soft)]">
                      {describeMove(move)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <button type="button" className="btn-secondary w-full" onClick={onReset}>
          Input warna lagi
        </button>
      </div>
    </div>
  );
}
