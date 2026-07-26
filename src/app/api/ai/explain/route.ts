import { NextResponse } from "next/server";
import { explainMoveLocal } from "@/lib/ai/explain";
import type { MoveToken } from "@/lib/cube/types";

export const runtime = "nodejs";

interface ExplainBody {
  move: MoveToken;
  step: number;
  total: number;
  algorithm: string;
  previousMoves?: MoveToken[];
}

export async function POST(request: Request) {
  let body: ExplainBody;
  try {
    body = (await request.json()) as ExplainBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.move || typeof body.step !== "number" || typeof body.total !== "number") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const local = explainMoveLocal({
    move: body.move,
    step: body.step,
    total: body.total,
    algorithm: body.algorithm ?? "",
    previousMoves: body.previousMoves ?? [],
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ tip: local });
  }

  try {
    const enriched = await enrichWithOpenAI(apiKey, body, local.body);
    return NextResponse.json({
      tip: {
        ...local,
        body: enriched,
        source: "openai" as const,
        title: `AI Coach · ${body.move}`,
      },
    });
  } catch {
    return NextResponse.json({ tip: local });
  }
}

async function enrichWithOpenAI(
  apiKey: string,
  body: ExplainBody,
  localBody: string,
): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Kamu coach Rubik 3x3 untuk pemula berbahasa Indonesia. Jelaskan 2-3 kalimat singkat cara melakukan gerakan saat ini. Jangan ubah notasi. Fokus pegangan tangan dan arah putar.",
        },
        {
          role: "user",
          content: [
            `Gerakan: ${body.move}`,
            `Langkah: ${body.step + 1}/${body.total}`,
            `Algoritma penuh: ${body.algorithm}`,
            `Gerakan sebelumnya: ${(body.previousMoves ?? []).join(" ") || "(tidak ada)"}`,
            `Ringkasan lokal: ${localBody}`,
            "Tulis penjelasan yang lebih ramah dan mudah diikuti.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty OpenAI response");
  return text;
}
