"use client";

import { COLOR_META, type CubeStickers, type FaceId, type MoveToken } from "@/lib/cube/types";

interface Cube3DProps {
  cube: CubeStickers;
  activeMove?: MoveToken | null;
  animating?: boolean;
  size?: number;
}

const FACE_TRANSFORM: Record<FaceId, string> = {
  U: "rotateX(90deg) translateZ(VAR)",
  D: "rotateX(-90deg) translateZ(VAR)",
  F: "translateZ(VAR)",
  B: "rotateY(180deg) translateZ(VAR)",
  L: "rotateY(-90deg) translateZ(VAR)",
  R: "rotateY(90deg) translateZ(VAR)",
};

function movePulse(move?: MoveToken | null): FaceId | null {
  if (!move) return null;
  return move[0] as FaceId;
}

export function Cube3D({
  cube,
  activeMove = null,
  animating = false,
  size = 220,
}: Cube3DProps) {
  const half = size / 2;
  const pulseFace = movePulse(activeMove);
  const tilt =
    animating && activeMove
      ? moveTilt(activeMove)
      : "rotateX(-22deg) rotateY(-32deg)";

  return (
    <div
      className="relative mx-auto grid place-items-center"
      style={{ width: size * 1.55, height: size * 1.55, perspective: 900 }}
    >
      <div
        className="cube-stage relative transition-transform duration-500 ease-out"
        style={{
          width: size,
          height: size,
          transform: tilt,
          transformStyle: "preserve-3d",
        }}
      >
        {(Object.keys(cube) as FaceId[]).map((face) => (
          <div
            key={face}
            className={`absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[3px] p-[3px] rounded-[6px] transition duration-300 ${
              pulseFace === face ? "brightness-125" : ""
            }`}
            style={{
              transform: FACE_TRANSFORM[face].replace(/VAR/g, `${half}px`),
              transformStyle: "preserve-3d",
              background: "rgba(8,12,18,0.92)",
              boxShadow:
                pulseFace === face
                  ? "0 0 0 2px var(--accent), 0 12px 40px rgba(0,0,0,0.35)"
                  : "0 10px 30px rgba(0,0,0,0.28)",
            }}
          >
            {cube[face].map((color, i) => (
              <div
                key={`${face}-${i}`}
                className="min-h-0 min-w-0 rounded-[3px]"
                style={{
                  background: COLOR_META[color].hex,
                  boxShadow:
                    "inset 0 0 0 1px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-8 bottom-2 h-8 rounded-full bg-black/35 blur-xl" />
    </div>
  );
}

function moveTilt(move: MoveToken): string {
  const face = move[0];
  const prime = move.includes("'");
  const double = move.includes("2");
  const amount = double ? 18 : 12;
  const dir = prime ? -1 : 1;

  switch (face) {
    case "U":
      return `rotateX(${-22 - amount}deg) rotateY(-32deg)`;
    case "D":
      return `rotateX(${-22 + amount}deg) rotateY(-32deg)`;
    case "L":
      return `rotateX(-22deg) rotateY(${-32 - amount * dir}deg)`;
    case "R":
      return `rotateX(-22deg) rotateY(${-32 + amount * dir}deg)`;
    case "F":
      return `rotateX(-22deg) rotateY(-32deg) rotateZ(${amount * dir}deg)`;
    case "B":
      return `rotateX(-22deg) rotateY(-32deg) rotateZ(${-amount * dir}deg)`;
    default:
      return "rotateX(-22deg) rotateY(-32deg)";
  }
}
