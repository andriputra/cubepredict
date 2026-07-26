"use client";

import { useEffect, useState } from "react";
import {
  explainMoveLocal,
  explainOverviewLocal,
  type AiTip,
} from "@/lib/ai/explain";
import type { MoveToken } from "@/lib/cube/types";

interface AiCoachPanelProps {
  move: MoveToken | null;
  step: number;
  total: number;
  algorithm: string;
  previousMoves: MoveToken[];
  active?: boolean;
}

export function AiCoachPanel({
  move,
  step,
  total,
  algorithm,
  previousMoves,
  active = false,
}: AiCoachPanelProps) {
  const [tip, setTip] = useState<AiTip | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!move || step >= total) {
      setTip(null);
      return;
    }

    const local = explainMoveLocal({
      move,
      step,
      total,
      algorithm,
      previousMoves,
    });
    setTip(local);

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            move,
            step,
            total,
            algorithm,
            previousMoves,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { tip?: AiTip };
        if (!cancelled && data.tip) setTip(data.tip);
      } catch {
        // Keep local tip.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [move, step, total, algorithm, previousMoves]);

  if (step >= total) {
    return (
      <div className="panel p-4 sm:p-5">
        <p className="eyebrow">AI Coach</p>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Selesai! Kubus sudah tersusun. Kamu bisa putar ulang solusinya kapan saja.
        </p>
      </div>
    );
  }

  if (!move || !tip) return null;

  return (
    <div
      className={`panel p-4 transition sm:p-5 ${
        active ? "border-[var(--accent)]/35" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">AI Coach</p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          {loading ? "menyusun…" : tip.source === "openai" ? "OpenAI" : "Lokal"}
        </span>
      </div>

      <h3 className="font-display mt-2 text-lg text-[var(--ink)]">{tip.title}</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">{tip.progress}</p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{tip.body}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Pegangan
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
            {tip.hold}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Arah
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">
            {tip.direction}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        {explainOverviewLocal(
          // overview uses full algorithm length context via previous+current hint
          previousMoves.length + 1 === total
            ? [...previousMoves, move]
            : [...previousMoves, move],
        )}
      </p>
    </div>
  );
}
