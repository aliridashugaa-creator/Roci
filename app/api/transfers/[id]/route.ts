import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  seedStore();
  const { id } = await params;
  const { status } = await req.json();

  const validStatuses = ["pending", "in_transit", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const request = store.transferRequests.find((r) => r.id === Number(id));
  if (!request) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  const old = request.status;
  request.status = status;
  request.updatedAt = new Date().toISOString();

  logEvent("TRANSFER_STATUS", { id: request.id, from: old, to: status });

  return NextResponse.json(request);
}
