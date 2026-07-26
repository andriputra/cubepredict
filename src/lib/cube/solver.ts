"use client";

import Cube from "cubejs";
import {
  fromFaceletString,
  parseMoves,
  toFaceletString,
  validateCube,
} from "./engine";
import type { CubeStickers, MoveToken } from "./types";

let solverReady = false;
let initPromise: Promise<void> | null = null;

export function ensureSolverReady(): Promise<void> {
  if (solverReady) return Promise.resolve();
  if (!initPromise) {
    initPromise = new Promise((resolve) => {
      setTimeout(() => {
        Cube.initSolver();
        solverReady = true;
        resolve();
      }, 40);
    });
  }
  return initPromise;
}

export interface SolveResult {
  ok: true;
  algorithm: string;
  moves: MoveToken[];
}

export interface SolveError {
  ok: false;
  errors: string[];
}

export async function solveCube(
  stickers: CubeStickers,
): Promise<SolveResult | SolveError> {
  const validation = validateCube(stickers);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  await ensureSolverReady();

  try {
    const facelets = toFaceletString(stickers);
    const cube = Cube.fromString(facelets);

    if (cube.isSolved()) {
      return { ok: true, algorithm: "", moves: [] };
    }

    const algorithm = cube.solve().trim();
    if (!algorithm) {
      return {
        ok: false,
        errors: [
          "Konfigurasi tidak bisa diselesaikan. Periksa ulang warna tiap stiker.",
        ],
      };
    }

    return {
      ok: true,
      algorithm,
      moves: parseMoves(algorithm),
    };
  } catch {
    return {
      ok: false,
      errors: [
        "Konfigurasi rubik tidak valid. Pastikan warna sesuai kubus fisik yang bisa diselesaikan.",
      ],
    };
  }
}

export function applyMove(
  stickers: CubeStickers,
  move: MoveToken,
): CubeStickers {
  const cube = Cube.fromString(toFaceletString(stickers));
  cube.move(move);
  return fromFaceletString(cube.asString());
}

export function applyMoves(
  stickers: CubeStickers,
  moves: MoveToken[],
): CubeStickers {
  if (moves.length === 0) return stickers;
  const cube = Cube.fromString(toFaceletString(stickers));
  cube.move(moves.join(" "));
  return fromFaceletString(cube.asString());
}

export function scrambleStickers(): CubeStickers {
  return fromFaceletString(Cube.random().asString());
}

export function statesAlongSolution(
  start: CubeStickers,
  moves: MoveToken[],
): CubeStickers[] {
  const states: CubeStickers[] = [start];
  let current = start;
  for (const move of moves) {
    current = applyMove(current, move);
    states.push(current);
  }
  return states;
}
