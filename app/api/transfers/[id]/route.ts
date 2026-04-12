import { NextResponse } from "next/server";
import { db, seedIfNeeded, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await seedIfNeeded();
  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["pending", "in_transit", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const transfers = await db.getTransfers();
  const request = transfers.find((r) => r.id === Number(id));
  if (!request) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  const old = request.status;
  request.status = status;
  request.updatedAt = new Date().toISOString();
  await db.setTransfers(transfers);

  await logEvent("TRANSFER_STATUS", { id: request.id, from: old, to: status });
  return NextResponse.json(request);
}
