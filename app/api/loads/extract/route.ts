import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

export async function POST(req: Request) {
  const { text } = await req.json() as { text: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract logistics booking details from the following message. Return ONLY a JSON object with these exact keys (use empty string "" if not found):
- customer (company or person name)
- origin (collection address or depot)
- destination (delivery address)
- collectionDate (ISO datetime string, e.g. "2026-04-15T09:00" — infer time as 09:00 if not stated; today is ${new Date().toISOString().split("T")[0]})
- eta (ISO datetime string for expected delivery)
- subcontractor (carrier/haulier name if mentioned)
- subcontractorRef (their reference/job number)
- notes (any other relevant info, special instructions, pallets, weight, etc.)

Message:
---
${text}
---

Respond with ONLY the JSON object, no explanation.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}
