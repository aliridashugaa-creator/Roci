import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const client = new Anthropic();

export async function GET() {
  try {
    const [loads, inventory, transfers, discrepancies] = await Promise.all([
      db.getLoads(), db.getInventory(), db.getTransfers(), db.getDiscrepancies(),
    ]);

    const summary = {
      loads: {
        total: loads.length,
        active: loads.filter((l) => ["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status)).length,
        failed: loads.filter((l) => l.status === "failed").length,
        podOutstanding: loads.filter((l) => l.status === "delivered" && l.podStatus !== "received").length,
        podChased: loads.filter((l) => l.podStatus === "chased").length,
        subPending: loads.filter((l) => l.subcontractor && !l.subcontractorReconciled && ["delivered", "pod_received"].includes(l.status)).length,
        rebooked: loads.filter((l) => l.status === "rebooked").length,
      },
      inventory: {
        totalSKUs: inventory.length,
        zeroStock: inventory.filter((i) => (i.quantity ?? 0) === 0).length,
      },
      transfers: {
        pending: transfers.filter((t) => t.status === "pending").length,
        inTransit: transfers.filter((t) => t.status === "in_transit").length,
      },
      discrepancies: {
        open: discrepancies.filter((d) => d.status === "open").length,
        investigating: discrepancies.filter((d) => d.status === "investigating").length,
      },
    };

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are an operational AI for a logistics company. Based on this data snapshot, return a JSON object with:
- "summary": one sentence (max 20 words) describing the overall operational state
- "alerts": array of up to 4 objects {level: "red"|"amber"|"green", text: string} — most critical first
- "recommendations": array of up to 3 short action strings

Data: ${JSON.stringify(summary)}
Today: ${new Date().toISOString().split("T")[0]}

Respond with ONLY the JSON object.`,
      }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({
      summary: "Unable to generate insights.",
      alerts: [],
      recommendations: [],
    });
  }
}
