"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  COLOR_META,
  type CubeStickers,
  type FaceId,
  type MoveToken,
  type StickerColor,
} from "@/lib/cube/types";

interface Cube3DProps {
  cube: CubeStickers;
  activeMove?: MoveToken | null;
  animating?: boolean;
  size?: number;
  durationMs?: number;
  onAnimationEnd?: () => void;
  /** Enable click-drag / touch to orbit the cube. */
  interactive?: boolean;
}

type Vec3 = { x: number; y: number; z: number };

interface CubieData {
  id: string;
  x: number;
  y: number;
  z: number;
  stickers: Partial<Record<FaceId, StickerColor>>;
}

const DEFAULT_ROT = { x: -24, y: -34 };
const AXES: Array<-1 | 0 | 1> = [-1, 0, 1];

function stickerAt(
  cube: CubeStickers,
  face: FaceId,
  x: number,
  y: number,
  z: number,
): StickerColor | null {
  let index = -1;
  switch (face) {
    case "U":
      if (y !== 1) return null;
      index = (z + 1) * 3 + (x + 1);
      break;
    case "D":
      if (y !== -1) return null;
      index = (1 - z) * 3 + (x + 1);
      break;
    case "F":
      if (z !== 1) return null;
      index = (1 - y) * 3 + (x + 1);
      break;
    case "B":
      if (z !== -1) return null;
      index = (1 - y) * 3 + (1 - x);
      break;
    case "L":
      if (x !== -1) return null;
      index = (1 - y) * 3 + (z + 1);
      break;
    case "R":
      if (x !== 1) return null;
      index = (1 - y) * 3 + (1 - z);
      break;
  }
  return cube[face][index];
}

function buildCubies(cube: CubeStickers): CubieData[] {
  const cubies: CubieData[] = [];
  for (const x of AXES) {
    for (const y of AXES) {
      for (const z of AXES) {
        if (x === 0 && y === 0 && z === 0) continue;
        const stickers: Partial<Record<FaceId, StickerColor>> = {};
        (["U", "D", "F", "B", "L", "R"] as FaceId[]).forEach((face) => {
          const color = stickerAt(cube, face, x, y, z);
          if (color) stickers[face] = color;
        });
        cubies.push({ id: `${x},${y},${z}`, x, y, z, stickers });
      }
    }
  }
  return cubies;
}

function layerAxis(face: FaceId): keyof Vec3 {
  if (face === "L" || face === "R") return "x";
  if (face === "U" || face === "D") return "y";
  return "z";
}

function layerValue(face: FaceId): -1 | 1 {
  if (face === "R" || face === "U" || face === "F") return 1;
  return -1;
}

function isInLayer(cubie: CubieData, face: FaceId): boolean {
  return cubie[layerAxis(face)] === layerValue(face);
}

function rotationForMove(move: MoveToken): { axis: "X" | "Y" | "Z"; deg: number } {
  const face = move[0] as FaceId;
  const turns = move.includes("2") ? 2 : 1;
  const prime = move.includes("'");
  const cw = {
    U: { axis: "Y" as const, sign: -1 },
    D: { axis: "Y" as const, sign: 1 },
    R: { axis: "X" as const, sign: -1 },
    L: { axis: "X" as const, sign: 1 },
    F: { axis: "Z" as const, sign: -1 },
    B: { axis: "Z" as const, sign: 1 },
  }[face];

  const dir = prime ? -cw.sign : cw.sign;
  return { axis: cw.axis, deg: dir * 90 * turns };
}

function facePlateTransform(face: FaceId, half: number): string {
  switch (face) {
    case "U":
      return `rotateX(90deg) translateZ(${half}px)`;
    case "D":
      return `rotateX(-90deg) translateZ(${half}px)`;
    case "F":
      return `translateZ(${half}px)`;
    case "B":
      return `rotateY(180deg) translateZ(${half}px)`;
    case "L":
      return `rotateY(-90deg) translateZ(${half}px)`;
    case "R":
      return `rotateY(90deg) translateZ(${half}px)`;
  }
}

export function Cube3D({
  cube,
  activeMove = null,
  animating = false,
  size = 220,
  durationMs = 700,
  onAnimationEnd,
  interactive = false,
}: Cube3DProps) {
  const cubies = useMemo(() => buildCubies(cube), [cube]);
  const cubieSize = size / 3.15;
  const gap = size / 3;
  const halfCubie = cubieSize / 2;

  const movingFace =
    animating && activeMove ? (activeMove[0] as FaceId) : null;

  const layerRef = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onAnimationEnd);
  onEndRef.current = onAnimationEnd;

  const [rot, setRot] = useState(DEFAULT_ROT);
  const [grabbing, setGrabbing] = useState(false);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Reliable layer turn via Web Animations API (avoids CSS transition races).
  useLayoutEffect(() => {
    if (!animating || !activeMove || !movingFace) return;

    const el = layerRef.current;
    if (!el) {
      const missing = window.setTimeout(() => onEndRef.current?.(), durationMs);
      return () => window.clearTimeout(missing);
    }

    const { axis, deg } = rotationForMove(activeMove);
    el.getAnimations().forEach((a) => a.cancel());

    const animation = el.animate(
      [
        { transform: `rotate${axis}(0deg)` },
        { transform: `rotate${axis}(${deg}deg)` },
      ],
      {
        duration: durationMs,
        easing: "cubic-bezier(0.22, 0.82, 0.2, 1)",
        fill: "forwards",
      },
    );

    let settled = false;
    let fallback = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallback);
      onEndRef.current?.();
    };

    animation.addEventListener("finish", finish);
    // Fallback if the finish event is skipped (tab background, etc.)
    fallback = window.setTimeout(finish, durationMs + 80);

    return () => {
      window.clearTimeout(fallback);
      animation.removeEventListener("finish", finish);
      if (!settled) animation.cancel();
    };
  }, [animating, activeMove, movingFace, durationMs]);

  useLayoutEffect(() => {
    if (!interactive) return;

    const onMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      setRot((prev) => ({
        x: Math.max(-78, Math.min(78, prev.x - dy * 0.45)),
        y: prev.y + dx * 0.45,
      }));
    };

    const onUp = () => {
      dragging.current = false;
      setGrabbing(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [interactive]);

  const rotating = cubies.filter((c) => movingFace && isInLayer(c, movingFace));
  const staticCubies = cubies.filter(
    (c) => !movingFace || !isInLayer(c, movingFace),
  );

  const viewTransform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;

  return (
    <div
      className={`relative mx-auto grid w-full max-w-full place-items-center overflow-visible ${
        interactive ? "select-none touch-none" : ""
      }`}
      style={{
        height: Math.round(size * 1.45),
        maxWidth: "100%",
        perspective: 1100,
        cursor: interactive ? (grabbing ? "grabbing" : "grab") : undefined,
      }}
      onPointerDown={
        interactive
          ? (event) => {
              if (event.button !== 0) return;
              dragging.current = true;
              setGrabbing(true);
              lastPointer.current = { x: event.clientX, y: event.clientY };
            }
          : undefined
      }
    >
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transform: viewTransform,
          transformStyle: "preserve-3d",
        }}
      >
        {staticCubies.map((cubie) => (
          <Cubie
            key={cubie.id}
            cubie={cubie}
            size={cubieSize}
            gap={gap}
            half={halfCubie}
            highlight={false}
          />
        ))}

        {movingFace ? (
          <div
            key={`${activeMove}-${movingFace}`}
            ref={layerRef}
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transform: "rotateX(0deg)",
              willChange: "transform",
            }}
          >
            {rotating.map((cubie) => (
              <Cubie
                key={cubie.id}
                cubie={cubie}
                size={cubieSize}
                gap={gap}
                half={halfCubie}
                highlight
              />
            ))}
          </div>
        ) : null}
      </div>

      {activeMove ? (
        <TurnBadge move={activeMove} animating={Boolean(movingFace)} />
      ) : null}

      {interactive ? (
        <div className="pointer-events-none absolute bottom-1 left-1/2 flex max-w-[95%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:bottom-2 sm:px-3">
          Drag untuk putar
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-white/15 px-2 py-0.5 text-[10px] tracking-normal text-[var(--ink-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            onClick={(event) => {
              event.stopPropagation();
              setRot(DEFAULT_ROT);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Reset view
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-10 bottom-3 h-8 rounded-full bg-black/35 blur-xl" />
      )}
    </div>
  );
}

function Cubie({
  cubie,
  size,
  gap,
  half,
  highlight,
}: {
  cubie: CubieData;
  size: number;
  gap: number;
  half: number;
  highlight: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        marginLeft: -half,
        marginTop: -half,
        transform: `translate3d(${cubie.x * gap}px, ${-cubie.y * gap}px, ${cubie.z * gap}px)`,
        transformStyle: "preserve-3d",
      }}
    >
      {(Object.keys(cubie.stickers) as FaceId[]).map((face) => {
        const color = cubie.stickers[face]!;
        return (
          <div
            key={face}
            className="absolute inset-0 rounded-[4px]"
            style={{
              transform: facePlateTransform(face, half),
              background: COLOR_META[color].hex,
              backfaceVisibility: "hidden",
              boxShadow: highlight
                ? "inset 0 0 0 1px rgba(0,0,0,0.28), 0 0 0 2px rgba(125,255,179,0.55)"
                : "inset 0 0 0 1px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          />
        );
      })}
      <div
        className="absolute inset-[8%] rounded-[3px] bg-[#0b121a]"
        style={{ transform: "translateZ(0px)", transformStyle: "preserve-3d" }}
      />
    </div>
  );
}

function TurnBadge({ move, animating }: { move: MoveToken; animating: boolean }) {
  const face = move[0] as FaceId;
  const prime = move.includes("'");
  const double = move.includes("2");
  const label = double ? "180°" : prime ? "90° ↺" : "90° ↻";

  return (
    <div
      className={`pointer-events-none absolute right-1 top-1 flex max-w-[90%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition sm:right-2 sm:top-2 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${
        animating
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-white/10 bg-black/35 text-[var(--ink-soft)]"
      }`}
    >
      <span className="font-mono font-semibold">{move}</span>
      <span aria-hidden className={animating ? "animate-spin-slow" : ""}>
        {prime ? "↺" : "↻"}
      </span>
      <span className="truncate">
        sisi {face} · {label}
      </span>
    </div>
  );
}
