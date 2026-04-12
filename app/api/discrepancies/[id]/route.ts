import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, notes } = await req.json();

  const validStatuses = ["open", "investigating", "resolved"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const items = await db.getDiscrepancies();
  const disc = items.find((d) => d.id === Number(id));
  if (!disc) {
    return NextResponse.json({ error: "Discrepancy not found" }, { status: 404 });
  }

  const old = disc.status;
  disc.status = status;
  if (notes) disc.notes = notes;
  if (status === "resolved") disc.resolvedAt = new Date().toISOString();
  await db.setDiscrepancies(items);

  await logEvent("DISCREPANCY_STATUS", { id: disc.id, sku: disc.sku, from: old, to: status });
  return NextResponse.json(disc);
}
