import { describeMove } from "@/lib/cube/engine";
import type { FaceId, MoveToken } from "@/lib/cube/types";

export type AiSource = "local" | "openai";

export interface AiTip {
  title: string;
  body: string;
  hold: string;
  direction: string;
  progress: string;
  source: AiSource;
}

const FACE_HOLD: Record<FaceId, string> = {
  U: "Sisi atas (yang menghadap langit / putih pusat)",
  D: "Sisi bawah (yang menghadap lantai / kuning pusat)",
  F: "Sisi depan (menghadapmu / hijau pusat)",
  B: "Sisi belakang (menjauh darimu / biru pusat)",
  L: "Sisi kiri (oranye pusat)",
  R: "Sisi kanan (merah pusat)",
};

function parseMove(move: MoveToken) {
  const face = move[0] as FaceId;
  const prime = move.includes("'");
  const double = move.includes("2");
  return { face, prime, double };
}

function directionText(prime: boolean, double: boolean): string {
  if (double) return "Putar 180° (setengah putaran), arah bebas";
  return prime
    ? "Putar 90° berlawanan jarum jam (↺)"
    : "Putar 90° searah jarum jam (↻)";
}

function howToHold(face: FaceId): string {
  return `Pegang kubus stabil, fokus ke ${FACE_HOLD[face].toLowerCase()}. Jangan memutar seluruh kubus — hanya lapisan sisi itu.`;
}

function contextualTip(
  move: MoveToken,
  step: number,
  total: number,
  previous: MoveToken[],
): string {
  const { face, prime, double } = parseMove(move);
  const prev = previous[previous.length - 1];
  const parts: string[] = [];

  if (step === 0) {
    parts.push(
      "Ini gerakan pertama. Pastikan orientasi masih: putih di atas, hijau di depan.",
    );
  } else if (step >= total - 1) {
    parts.push("Hampir selesai — gerakan terakhir, kerjakan pelan dan akurat.");
  } else if (step < total * 0.33) {
    parts.push("Fase awal: masih menyusun struktur besar kubus.");
  } else if (step < total * 0.66) {
    parts.push("Fase tengah: potongan mulai saling mengunci.");
  } else {
    parts.push("Fase akhir: biasanya hanya penyelarasan sisa lapisan.");
  }

  if (prev) {
    const prevFace = prev[0];
    if (prevFace === face) {
      parts.push(
        `Sisi ${face} diputar lagi — lanjut dari posisi tangan yang sama biar lebih cepat.`,
      );
    } else if (
      (prevFace === "U" && face === "D") ||
      (prevFace === "D" && face === "U") ||
      (prevFace === "L" && face === "R") ||
      (prevFace === "R" && face === "L") ||
      (prevFace === "F" && face === "B") ||
      (prevFace === "B" && face === "F")
    ) {
      parts.push(
        "Berganti ke sisi berlawanan — putar kubus di tangan sedikit atau ulurkan jari ke sisi lawan.",
      );
    }
  }

  if (double) {
    parts.push("Gerakan 180°: satu tarikan tegas sampai sisi kembali menghadap kamu.");
  } else if (prime) {
    parts.push(
      "Apostrof (') = arah berlawanan jarum jam jika kamu melihat sisi tersebut langsung.",
    );
  }

  parts.push(describeMove(move) + ".");
  return parts.join(" ");
}

/** Always-available local AI coach (no network / no API key). */
export function explainMoveLocal(input: {
  move: MoveToken;
  step: number;
  total: number;
  algorithm: string;
  previousMoves?: MoveToken[];
}): AiTip {
  const { move, step, total, previousMoves = [] } = input;
  const { face, prime, double } = parseMove(move);

  return {
    title: `AI Coach · ${move}`,
    body: contextualTip(move, step, total, previousMoves),
    hold: howToHold(face),
    direction: directionText(prime, double),
    progress: `Langkah ${step + 1} dari ${total}`,
    source: "local",
  };
}

export function explainOverviewLocal(moves: MoveToken[]): string {
  if (moves.length === 0) return "Kubus sudah selesai — tidak ada gerakan.";
  const faces = new Set(moves.map((m) => m[0]));
  return `Solusi Kociemba: ${moves.length} gerakan, melibatkan sisi ${[...faces].join(", ")}. Ikuti AI Coach per langkah; visualisasi 3D menunjukkan arah putar yang benar.`;
}
