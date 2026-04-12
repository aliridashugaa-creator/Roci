import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  seedStore();
  const { id } = await params;
  const { status, notes } = await req.json();

  const validStatuses = ["open", "investigating", "resolved"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const disc = store.discrepancies.find((d) => d.id === Number(id));
  if (!disc) {
    return NextResponse.json({ error: "Discrepancy not found" }, { status: 404 });
  }

  const old = disc.status;
  disc.status = status;
  if (notes) disc.notes = notes;
  if (status === "resolved") disc.resolvedAt = new Date().toISOString();

  logEvent("DISCREPANCY_STATUS", { id: disc.id, sku: disc.sku, from: old, to: status });

  return NextResponse.json(disc);
}
