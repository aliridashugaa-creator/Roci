import { NextResponse } from "next/server";
import store, { seedStore, logEvent, LoadStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUS_FLOW: LoadStatus[] = [
  "booked",
  "collected",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "pod_received",
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  seedStore();
  const { id } = await params;
  const body = await req.json();
  const load = store.loads.find((l) => l.id === Number(id));

  if (!load) {
    return NextResponse.json({ error: "Load not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // --- Update status ---
  if (body.action === "status") {
    const { status } = body as { status: LoadStatus };
    const valid: LoadStatus[] = [...STATUS_FLOW, "failed", "cancelled"];
    if (!valid.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const old = load.status;
    load.status = status;
    load.updatedAt = now;
    logEvent("LOAD_STATUS", { reference: load.reference, from: old, to: status });
  }

  // --- Update ETA ---
  else if (body.action === "eta") {
    const { eta, note } = body as { eta: string; note: string };
    load.etaUpdates.push({ timestamp: now, eta, note: note ?? "" });
    load.eta = eta;
    load.updatedAt = now;
    logEvent("LOAD_ETA_UPDATE", { reference: load.reference, newEta: eta, note });
  }

  // --- Chase POD ---
  else if (body.action === "pod_chase") {
    load.podStatus = "chased";
    load.updatedAt = now;
    logEvent("POD_CHASED", { reference: load.reference, customer: load.customer });
  }

  // --- Mark POD received ---
  else if (body.action === "pod_received") {
    load.podStatus = "received";
    load.podReceivedAt = now;
    load.status = "pod_received";
    load.updatedAt = now;
    logEvent("POD_RECEIVED", { reference: load.reference, customer: load.customer });
  }

  // --- Rebook failed delivery ---
  else if (body.action === "rebook") {
    const { collectionDate, eta, notes } = body as { collectionDate: string; eta: string; notes?: string };
    const newRef = `LOAD-${String(store.loads.length + 1).padStart(3, "0")}`;

    const rebooked = {
      ...load,
      id: store.loads.length + 1,
      reference: newRef,
      status: "booked" as LoadStatus,
      collectionDate,
      eta,
      podStatus: "pending" as const,
      podReceivedAt: undefined,
      etaUpdates: [],
      notes: notes ?? `Rebooked from ${load.reference}`,
      rebookedFromId: load.id,
      createdAt: now,
      updatedAt: now,
    };

    load.status = "rebooked";
    load.updatedAt = now;

    store.loads.unshift(rebooked);
    logEvent("LOAD_REBOOKED", { original: load.reference, new: newRef, customer: load.customer });

    return NextResponse.json(rebooked);
  }

  // --- Reconcile subcontractor ---
  else if (body.action === "reconcile") {
    load.subcontractorReconciled = true;
    load.updatedAt = now;
    logEvent("SUB_RECONCILED", { reference: load.reference, subcontractor: load.subcontractor, subcontractorRef: load.subcontractorRef });
  }

  else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json(load);
}
