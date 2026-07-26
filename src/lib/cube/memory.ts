import type { CubeStickers, MoveToken } from "@/lib/cube/types";

export type MemorySource = "manual" | "camera" | "scramble";

export interface CubeMemory {
  id: string;
  createdAt: string;
  updatedAt: string;
  label: string;
  source: MemorySource;
  stickers: CubeStickers;
  algorithm: string;
  moves: MoveToken[];
  moveCount: number;
  note?: string;
}

const STORAGE_KEY = "cubepredict.memory.v1";
const MAX_MEMORIES = 40;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function listMemories(): CubeMemory[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CubeMemory[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeMemories(items: CubeMemory[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_MEMORIES)));
}

export function saveMemory(
  input: Omit<CubeMemory, "id" | "createdAt" | "updatedAt" | "moveCount"> & {
    id?: string;
  },
): CubeMemory {
  const now = new Date().toISOString();
  const existing = listMemories();
  const id = input.id ?? crypto.randomUUID();
  const previous = existing.find((item) => item.id === id);

  const memory: CubeMemory = {
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    label: input.label.trim() || defaultLabel(now),
    source: input.source,
    stickers: input.stickers,
    algorithm: input.algorithm,
    moves: input.moves,
    moveCount: input.moves.length,
    note: input.note,
  };

  const next = [memory, ...existing.filter((item) => item.id !== id)];
  writeMemories(next);
  return memory;
}

export function deleteMemory(id: string) {
  writeMemories(listMemories().filter((item) => item.id !== id));
}

export function clearMemories() {
  if (!canUseStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getMemory(id: string): CubeMemory | null {
  return listMemories().find((item) => item.id === id) ?? null;
}

function defaultLabel(iso: string): string {
  const date = new Date(iso);
  return `Scan ${date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function sourceLabel(source: MemorySource): string {
  if (source === "camera") return "Kamera";
  if (source === "scramble") return "Acak";
  return "Manual";
}
