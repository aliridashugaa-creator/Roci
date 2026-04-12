import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import type { LoadStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUS_FLOW: LoadStatus[] = [
  "booked", "collected", "in_transit", "out_for_delivery", "delivered", "pod_received",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [loads, txns] = await Promise.all([db.getLoads(), db.getTransactions()]);
  const load = loads.find((l) => l.id === Number(id));
  if (!load) return NextResponse.json({ error: "Load not found" }, { status: 404 });
  const timeline = txns
    .filter((t) => t.details?.reference === load.reference || t.details?.original === load.reference || t.details?.new === load.reference)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return NextResponse.json({ load, timeline });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const loads = await db.getLoads();
  const load = loads.find((l) => l.id === Number(id));
  if (!load) {
    return NextResponse.json({ error: "Load not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (body.action === "status") {
    const { status } = body as { status: LoadStatus };
    const valid: LoadStatus[] = [...STATUS_FLOW, "failed", "cancelled"];
    if (!valid.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const old = load.status;
    load.status = status;
    load.updatedAt = now;
    await db.setLoads(loads);
    await logEvent("LOAD_STATUS", { reference: load.reference, from: old, to: status });
  }

  else if (body.action === "eta") {
    const { eta, note } = body as { eta: string; note: string };
    load.etaUpdates.push({ timestamp: now, eta, note: note ?? "" });
    load.eta = eta;
    load.updatedAt = now;
    await db.setLoads(loads);
    await logEvent("LOAD_ETA_UPDATE", { reference: load.reference, newEta: eta, note });
  }

  else if (body.action === "pod_chase") {
    load.podStatus = "chased";
    load.updatedAt = now;
    await db.setLoads(loads);
    await logEvent("POD_CHASED", { reference: load.reference, customer: load.customer });
  }

  else if (body.action === "pod_received") {
    load.podStatus = "received";
    load.podReceivedAt = now;
    load.status = "pod_received";
    load.updatedAt = now;
    await db.setLoads(loads);
    await logEvent("POD_RECEIVED", { reference: load.reference, customer: load.customer });
  }

  else if (body.action === "rebook") {
    const { collectionDate, eta, notes } = body as { collectionDate: string; eta: string; notes?: string };
    const newRef = `LOAD-${String(loads.length + 1).padStart(3, "0")}`;
    const rebooked = {
      ...load,
      id: loads.length + 1,
      reference: newRef,
      status: "booked" as LoadStatus,
      collectionDate, eta,
      podStatus: "pending" as const,
      podReceivedAt: undefined,
      etaUpdates: [],
      notes: notes ?? `Rebooked from ${load.reference}`,
      rebookedFromId: load.id,
      createdAt: now, updatedAt: now,
    };
    load.status = "rebooked";
    load.updatedAt = now;
    loads.unshift(rebooked);
    await db.setLoads(loads);
    await logEvent("LOAD_REBOOKED", { original: load.reference, new: newRef, customer: load.customer });
    return NextResponse.json(rebooked);
  }

  else if (body.action === "reconcile") {
    load.subcontractorReconciled = true;
    load.updatedAt = now;
    await db.setLoads(loads);
    await logEvent("SUB_RECONCILED", { reference: load.reference, subcontractor: load.subcontractor, subcontractorRef: load.subcontractorRef });
  }

  else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json(load);
}
