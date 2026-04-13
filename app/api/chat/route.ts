import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db, logEvent } from "@/lib/db";
import type { LoadSource, LoadStatus, PodStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

const client = new Anthropic();

// ── tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_summary",
    description: "Get live KPI summary: load counts, inventory totals, active transfers, open discrepancies.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_loads",
    description: "Retrieve loads. Optionally filter by status group.",
    input_schema: {
      type: "object" as const,
      properties: {
        filter: {
          type: "string",
          enum: ["all", "active", "failed", "delivered", "sub_pending", "pod_outstanding"],
          description: "active=in-progress, failed=failed deliveries, delivered=delivered/POD, sub_pending=unreconciled subcontractors, pod_outstanding=delivered but no POD",
        },
      },
    },
  },
  {
    name: "get_inventory",
    description: "Get all inventory / stock items with SKU, quantity, location.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_transfers",
    description: "Get all stock transfer records.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_discrepancies",
    description: "Get all discrepancy records.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_recent_activity",
    description: "Get recent transaction log events (audit trail).",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Number of events to return (default 20)" },
      },
    },
  },
  {
    name: "create_load",
    description: "Book a new load. Use when the user asks to create, book, or add a load/delivery.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer: { type: "string" },
        origin: { type: "string" },
        destination: { type: "string" },
        collectionDate: { type: "string", description: "ISO datetime e.g. 2026-04-15T09:00" },
        eta: { type: "string", description: "ISO datetime for expected delivery" },
        source: { type: "string", enum: ["email", "whatsapp", "phone", "manual"] },
        subcontractor: { type: "string" },
        subcontractorRef: { type: "string" },
        notes: { type: "string" },
      },
      required: ["customer", "origin", "destination", "collectionDate", "eta"],
    },
  },
  {
    name: "update_load",
    description: "Update an existing load by reference. Actions: advance/change status, update ETA, mark POD received, reconcile subcontractor.",
    input_schema: {
      type: "object" as const,
      properties: {
        reference: { type: "string", description: "Load reference e.g. LOAD-001" },
        action: {
          type: "string",
          enum: ["status", "eta", "pod_chase", "pod_received", "reconcile"],
        },
        status: { type: "string", description: "New status value (required for action=status)" },
        eta: { type: "string", description: "New ETA ISO datetime (required for action=eta)" },
        note: { type: "string", description: "Optional note for ETA update" },
      },
      required: ["reference", "action"],
    },
  },
];

// ── tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_summary": {
      const [inventory, loads, transfers, discrepancies] = await Promise.all([
        db.getInventory(), db.getLoads(), db.getTransfers(), db.getDiscrepancies(),
      ]);
      const active = loads.filter((l) =>
        ["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status)
      );
      return {
        totalSKUs: inventory.length,
        totalUnits: inventory.reduce((s, i) => s + (Number((i as unknown as Record<string, unknown>).quantity) || 0), 0),
        totalLoads: loads.length,
        activeLoads: active.length,
        failedLoads: loads.filter((l) => l.status === "failed").length,
        podOutstanding: loads.filter((l) => l.status === "delivered" && l.podStatus !== "received").length,
        subPending: loads.filter((l) => l.subcontractor && !l.subcontractorReconciled && ["delivered", "pod_received"].includes(l.status)).length,
        activeTransfers: transfers.filter((t) => ["pending", "in_transit"].includes((t as unknown as Record<string, unknown>).status as string)).length,
        openDiscrepancies: discrepancies.filter((d) => (d as unknown as Record<string, unknown>).status === "open").length,
      };
    }

    case "get_loads": {
      const loads = await db.getLoads();
      const f = input.filter as string | undefined;
      if (!f || f === "all") return loads;
      if (f === "active") return loads.filter((l) => ["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status));
      if (f === "failed") return loads.filter((l) => l.status === "failed");
      if (f === "delivered") return loads.filter((l) => ["delivered", "pod_received"].includes(l.status));
      if (f === "sub_pending") return loads.filter((l) => l.subcontractor && !l.subcontractorReconciled);
      if (f === "pod_outstanding") return loads.filter((l) => l.status === "delivered" && l.podStatus !== "received");
      return loads;
    }

    case "get_inventory": return db.getInventory();
    case "get_transfers": return db.getTransfers();
    case "get_discrepancies": return db.getDiscrepancies();

    case "get_recent_activity": {
      const txns = await db.getTransactions();
      const limit = Number(input.limit ?? 20);
      return txns.slice(0, limit);
    }

    case "create_load": {
      const loads = await db.getLoads();
      const newId = loads.length + 1;
      const ref = `LOAD-${String(newId).padStart(3, "0")}`;
      const now = new Date().toISOString();
      const load = {
        id: newId,
        reference: ref,
        source: ((input.source as string) || "manual") as LoadSource,
        customer: input.customer as string,
        origin: input.origin as string,
        destination: input.destination as string,
        collectionDate: input.collectionDate as string,
        eta: input.eta as string,
        status: "booked" as LoadStatus,
        subcontractor: (input.subcontractor as string) || "",
        subcontractorRef: (input.subcontractorRef as string) || "",
        subcontractorReconciled: false,
        podStatus: "pending" as PodStatus,
        etaUpdates: [],
        notes: (input.notes as string) || "",
        createdAt: now,
        updatedAt: now,
      };
      loads.unshift(load);
      await db.setLoads(loads);
      await logEvent("LOAD_CREATED", { reference: ref, customer: load.customer, source: "ai_chat" });
      return { success: true, reference: ref, load };
    }

    case "update_load": {
      const loads = await db.getLoads();
      const load = loads.find((l) => l.reference === input.reference);
      if (!load) return { error: `Load ${input.reference} not found` };
      const now = new Date().toISOString();
      const action = input.action as string;

      if (action === "status") {
        const old = load.status;
        load.status = input.status as typeof load.status;
        load.updatedAt = now;
        await logEvent("LOAD_STATUS", { reference: load.reference, from: old, to: input.status, source: "ai_chat" });
      } else if (action === "eta") {
        load.etaUpdates.push({ timestamp: now, eta: input.eta as string, note: (input.note as string) || "" });
        load.eta = input.eta as string;
        load.updatedAt = now;
        await logEvent("LOAD_ETA_UPDATE", { reference: load.reference, newEta: input.eta, source: "ai_chat" });
      } else if (action === "pod_chase") {
        load.podStatus = "chased";
        load.updatedAt = now;
        await logEvent("POD_CHASED", { reference: load.reference, source: "ai_chat" });
      } else if (action === "pod_received") {
        load.podStatus = "received";
        load.podReceivedAt = now;
        load.status = "pod_received";
        load.updatedAt = now;
        await logEvent("POD_RECEIVED", { reference: load.reference, source: "ai_chat" });
      } else if (action === "reconcile") {
        load.subcontractorReconciled = true;
        load.updatedAt = now;
        await logEvent("SUB_RECONCILED", { reference: load.reference, source: "ai_chat" });
      }

      await db.setLoads(loads);
      return { success: true, load };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
  const { messages } = await req.json() as { messages: Anthropic.MessageParam[] };

  const today = new Date().toISOString().split("T")[0];
  const system = `You are Roci, an AI operations assistant built into a logistics OS. You have live access to loads, inventory, transfers, and discrepancies.

You can:
- Answer questions about current operations (loads, stock, transfers, discrepancies)
- Create new bookings or update existing ones
- Identify problems, flag risks, and provide operational forecasts
- Summarise activity and highlight what needs attention

Guidelines:
- Be concise and operational — this is a busy logistics environment
- When showing data, use clear formatting (bullet points, tables in markdown)
- When taking write actions, confirm exactly what you did
- If a reference number isn't clear, ask for clarification before acting
- Today is ${today}`;

  const actions: string[] = [];
  let currentMessages = [...messages];

  // Agentic loop — max 6 rounds
  for (let round = 0; round < 6; round++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system,
      tools: TOOLS,
      messages: currentMessages,
    });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      return NextResponse.json({ content: text, actions });
    }

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const use of toolUses) {
        const result = await executeTool(use.name, use.input as Record<string, unknown>);
        actions.push(use.name);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(result),
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    } else {
      break;
    }
  }

  return NextResponse.json({ content: "I wasn't able to complete that request.", actions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Chat route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
