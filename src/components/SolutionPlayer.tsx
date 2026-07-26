"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cube3D } from "@/components/Cube3D";
import { describeMove } from "@/lib/cube/engine";
import { statesAlongSolution } from "@/lib/cube/solver";
import type { CubeStickers, FaceId, MoveToken } from "@/lib/cube/types";

const ANIM_MS = 780;
const GAP_MS = 160;

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
  const playingRef = useRef(false);
  const animatingRef = useRef(false);
  const stepRef = useRef(0);

  const total = moves.length;
  const currentMove = step < total ? moves[step] : null;
  const displayCube = states[step];

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const finishAnimation = useCallback(() => {
    if (!animatingRef.current) return;
    animatingRef.current = false;
    setAnimating(false);

    const next = Math.min(stepRef.current + 1, total);
    stepRef.current = next;
    setStep(next);

    if (next >= total) {
      playingRef.current = false;
      setPlaying(false);
    }
  }, [total]);

  // Auto-play queue: wait for idle, then start next move animation.
  useEffect(() => {
    if (!playing || animating) return;
    if (step >= total) {
      setPlaying(false);
      return;
    }

    const kick = window.setTimeout(() => {
      if (!playingRef.current || animatingRef.current) return;
      animatingRef.current = true;
      setAnimating(true);
    }, GAP_MS);

    return () => window.clearTimeout(kick);
  }, [playing, animating, step, total]);

  const goTo = (next: number) => {
    playingRef.current = false;
    animatingRef.current = false;
    setPlaying(false);
    setAnimating(false);
    const clamped = Math.max(0, Math.min(next, total));
    stepRef.current = clamped;
    setStep(clamped);
  };

  const handleNext = () => {
    if (step >= total || animating) return;
    playingRef.current = false;
    setPlaying(false);
    animatingRef.current = true;
    setAnimating(true);
  };

  const handlePrev = () => {
    if (animating) return;
    goTo(step - 1);
  };

  const cubeSize = useResponsiveCubeSize();

  if (total === 0) {
    return (
      <div className="space-y-6 text-center">
        <Cube3D cube={start} size={cubeSize} />
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-8">
      <div className="panel relative min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Visualisasi langkah</p>
            <h2 className="font-display text-xl text-[var(--ink)] sm:text-2xl lg:text-3xl">
              {step === 0 && !animating
                ? "Posisi awal"
                : step === total
                  ? "Selesai"
                  : `Langkah ${Math.min(step + 1, total)} / ${total}`}
            </h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-[var(--accent)]">
            {total} moves
          </div>
        </div>

        <Cube3D
          cube={displayCube}
          activeMove={currentMove}
          animating={animating}
          durationMs={ANIM_MS}
          onAnimationEnd={finishAnimation}
          interactive
          size={cubeSize}
        />

        <div className="mt-4 rounded-2xl border border-white/8 bg-[var(--panel-deep)] p-3 text-center sm:mt-6 sm:p-4">
          {step < total ? (
            <>
              <p className="font-mono text-3xl font-semibold tracking-tight text-[var(--accent)] sm:text-4xl lg:text-5xl">
                {moves[step]}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {describeMove(moves[step])}
              </p>
              <MoveCoach move={moves[step]} active={animating} />
            </>
          ) : (
            <>
              <p className="font-display text-2xl text-[var(--ink)] sm:text-3xl">
                Cube solved
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Semua stiker sudah kembali ke posisi benar.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-5">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => goTo(0)}
            disabled={animating}
          >
            Awal
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrev}
            disabled={step === 0 || animating}
          >
            Prev
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (step >= total) {
                stepRef.current = 0;
                setStep(0);
                playingRef.current = true;
                setPlaying(true);
                return;
              }
              if (playing) {
                playingRef.current = false;
                setPlaying(false);
              } else {
                playingRef.current = true;
                setPlaying(true);
              }
            }}
          >
            {playing ? "Pause" : step >= total ? "Putar ulang" : "Play"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleNext}
            disabled={step >= total || animating}
          >
            Next
          </button>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="panel p-4 sm:p-5 lg:p-6">
          <p className="eyebrow">Algoritma</p>
          <p className="mt-2 break-words font-mono text-xs leading-6 text-[var(--ink-soft)] sm:text-sm sm:leading-7">
            {algorithm}
          </p>
        </div>

        <div className="panel max-h-[320px] overflow-y-auto p-3 sm:max-h-[420px] sm:p-4 lg:p-5">
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
                    disabled={animating}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition sm:gap-3 sm:px-3 sm:py-2.5 ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : done
                          ? "border-white/8 bg-white/[0.03] opacity-70"
                          : "border-white/8 bg-transparent hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="w-7 shrink-0 font-mono text-xs text-[var(--muted)] sm:w-8">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="w-10 shrink-0 font-mono text-sm font-semibold text-[var(--accent)] sm:w-12 sm:text-base">
                      {move}
                    </span>
                    <span className="min-w-0 text-xs text-[var(--ink-soft)] sm:text-sm">
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

function MoveCoach({ move, active }: { move: MoveToken; active: boolean }) {
  const face = move[0] as FaceId;
  const prime = move.includes("'");
  const double = move.includes("2");
  const faceName: Record<FaceId, string> = {
    U: "atas",
    D: "bawah",
    F: "depan",
    B: "belakang",
    L: "kiri",
    R: "kanan",
  };

  return (
    <div
      className={`mt-3 flex items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition sm:mt-4 sm:gap-3 sm:px-3 sm:text-sm ${
        active
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--ink)]"
          : "border-white/8 bg-white/[0.03] text-[var(--ink-soft)]"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 font-mono text-lg sm:h-10 sm:w-10 sm:text-xl ${
          active ? "animate-turn-hint text-[var(--accent)]" : "text-[var(--accent)]"
        }`}
        style={{ animationDirection: prime ? "reverse" : "normal" }}
        aria-hidden
      >
        {double ? "⟳" : prime ? "↺" : "↻"}
      </span>
      <p className="text-left leading-snug">
        {double ? (
          <>
            Putar sisi <strong>{faceName[face]}</strong> setengah putaran (180°).
          </>
        ) : (
          <>
            Pegang sisi <strong>{faceName[face]}</strong>, putar 90°{" "}
            {prime ? "berlawanan jarum jam" : "searah jarum jam"}.
          </>
        )}
      </p>
    </div>
  );
}

function useResponsiveCubeSize() {
  const [size, setSize] = useState(220);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 400) setSize(160);
      else if (w < 640) setSize(180);
      else if (w < 1024) setSize(210);
      else setSize(240);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}
