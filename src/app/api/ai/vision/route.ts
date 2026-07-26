import { NextResponse } from "next/server";
import { COLOR_ORDER, type StickerColor } from "@/lib/cube/types";

export const runtime = "nodejs";

interface VisionBody {
  /** data URL or raw base64 JPEG/PNG of one face (square crop). */
  imageBase64: string;
  /** Expected center color for this face. */
  center: StickerColor;
  face?: string;
}

/**
 * Optional OpenAI Vision refine for one Rubik face.
 * Falls back with 503 if OPENAI_API_KEY is missing so client uses on-device AI.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured", available: false },
      { status: 503 },
    );
  }

  let body: VisionBody;
  try {
    body = (await request.json()) as VisionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.imageBase64 || !body.center) {
    return NextResponse.json({ error: "Missing imageBase64/center" }, { status: 400 });
  }

  const imageUrl = body.imageBase64.startsWith("data:")
    ? body.imageBase64
    : `data:image/jpeg;base64,${body.imageBase64}`;

  const model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content:
              "You read a Rubik's cube face photo with a 3x3 sticker grid. Reply ONLY JSON: {\"colors\":[\"W|Y|R|O|G|B\" x9]} row-major left-to-right, top-to-bottom. Center index 4 must match the given center color. No markdown.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Face center must be ${body.center}. Face id: ${body.face ?? "?"}. Return 9 colors.`,
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenAI ${response.status}`, available: true },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = extractColors(text, body.center);
    if (!parsed) {
      return NextResponse.json({ error: "Parse failed", raw: text }, { status: 502 });
    }

    return NextResponse.json({
      colors: parsed,
      source: "openai",
      available: true,
    });
  } catch {
    return NextResponse.json({ error: "Vision request failed" }, { status: 502 });
  }
}

function extractColors(
  text: string,
  center: StickerColor,
): StickerColor[] | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const json = JSON.parse(match[0]) as { colors?: string[] };
    if (!Array.isArray(json.colors) || json.colors.length !== 9) return null;
    const colors = json.colors.map((c) => c.toUpperCase()) as StickerColor[];
    if (!colors.every((c) => COLOR_ORDER.includes(c))) return null;
    colors[4] = center;
    return colors;
  } catch {
    return null;
  }
}
