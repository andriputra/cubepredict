"use client";

import { useEffect, useMemo, useState } from "react";
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
}

type Vec3 = { x: number; y: number; z: number };

interface CubieData {
  id: string;
  x: number;
  y: number;
  z: number;
  stickers: Partial<Record<FaceId, StickerColor>>;
}

const BASE_TILT = "rotateX(-24deg) rotateY(-34deg)";
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
      // U1 toward B (z=-1), U7 toward F (z=1)
      index = (z + 1) * 3 + (x + 1);
      break;
    case "D":
      if (y !== -1) return null;
      // D1 toward F (z=1), D7 toward B (z=-1)
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

/**
 * Degrees of CSS rotation for a CW turn as viewed looking at that face.
 * Double turns use ±180; primes invert the CW amount.
 */
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
}: Cube3DProps) {
  const cubies = useMemo(() => buildCubies(cube), [cube]);
  const cubieSize = size / 3.15;
  const gap = size / 3;
  const halfCubie = cubieSize / 2;

  const [spin, setSpin] = useState<{
    face: FaceId;
    axis: "X" | "Y" | "Z";
    deg: number;
  } | null>(null);

  useEffect(() => {
    if (!animating || !activeMove) {
      setSpin(null);
      return;
    }

    const face = activeMove[0] as FaceId;
    const { axis, deg } = rotationForMove(activeMove);

    // Reset to 0 first so CSS transition always runs from identity.
    setSpin({ face, axis, deg: 0 });
    const start = requestAnimationFrame(() => {
      setSpin({ face, axis, deg });
    });

    const end = window.setTimeout(() => {
      onAnimationEnd?.();
    }, durationMs + 40);

    return () => {
      cancelAnimationFrame(start);
      window.clearTimeout(end);
    };
  }, [animating, activeMove, durationMs, onAnimationEnd]);

  const movingFace = spin?.face ?? null;
  const rotating = cubies.filter((c) => movingFace && isInLayer(c, movingFace));
  const staticCubies = cubies.filter((c) => !movingFace || !isInLayer(c, movingFace));

  const layerRotation =
    spin && spin.deg !== 0
      ? `rotate${spin.axis}(${spin.deg}deg)`
      : "none";

  return (
    <div
      className="relative mx-auto grid place-items-center"
      style={{ width: size * 1.7, height: size * 1.7, perspective: 1100 }}
    >
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transform: BASE_TILT,
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
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transform: layerRotation,
              transition:
                spin && spin.deg !== 0
                  ? `transform ${durationMs}ms cubic-bezier(0.22, 0.8, 0.28, 1)`
                  : "none",
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

      {activeMove ? <TurnBadge move={activeMove} animating={Boolean(spin && spin.deg)} /> : null}
      <div className="pointer-events-none absolute inset-x-10 bottom-3 h-8 rounded-full bg-black/35 blur-xl" />
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
      {/* Inner plastic core so gaps don't show empty */}
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
  const label = double
    ? "180°"
    : prime
      ? "90° ↺"
      : "90° ↻";

  return (
    <div
      className={`pointer-events-none absolute right-2 top-2 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
        animating
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-white/10 bg-black/35 text-[var(--ink-soft)]"
      }`}
    >
      <span className="font-mono font-semibold">{move}</span>
      <span aria-hidden className={animating ? "animate-spin-slow" : ""}>
        {prime ? "↺" : "↻"}
      </span>
      <span>
        sisi {face} · {label}
      </span>
    </div>
  );
}
