import { NextResponse } from "next/server";
import store, { seedStore, logEvent, Load } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  seedStore();
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");

  let loads = store.loads;
  if (filter === "active") {
    loads = loads.filter((l) => ["booked", "collected", "in_transit", "out_for_delivery"].includes(l.status));
  } else if (filter === "pod_pending") {
    loads = loads.filter((l) => l.podStatus !== "received" && ["delivered", "pod_received"].includes(l.status) === false && l.status === "delivered" || (l.status !== "failed" && l.status !== "cancelled" && l.status !== "rebooked" && l.podStatus !== "received" && l.status === "delivered"));
  } else if (filter === "failed") {
    loads = loads.filter((l) => l.status === "failed");
  } else if (filter === "sub") {
    loads = loads.filter((l) => l.subcontractor && !l.subcontractorReconciled && ["delivered", "pod_received"].includes(l.status));
  }

  return NextResponse.json(loads);
}

export async function POST(req: Request) {
  seedStore();
  const body = await req.json();
  const { source, customer, origin, destination, collectionDate, eta, subcontractor, subcontractorRef, notes, reference } = body;

  if (!customer || !origin || !destination || !collectionDate || !eta) {
    return NextResponse.json(
      { error: "customer, origin, destination, collectionDate, eta required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const autoRef = reference?.trim() || `LOAD-${String(store.loads.length + 1).padStart(3, "0")}`;

  const load: Load = {
    id: store.loads.length + 1,
    reference: autoRef,
    source: source ?? "manual",
    customer,
    origin,
    destination,
    collectionDate,
    eta,
    status: "booked",
    subcontractor: subcontractor ?? "",
    subcontractorRef: subcontractorRef ?? "",
    subcontractorReconciled: false,
    podStatus: "pending",
    etaUpdates: [],
    notes: notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  store.loads.unshift(load);
  logEvent("LOAD_BOOKED", { reference: load.reference, customer, source: load.source, origin, destination });

  return NextResponse.json(load, { status: 201 });
}
