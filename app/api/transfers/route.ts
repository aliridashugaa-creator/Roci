import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();
  return NextResponse.json(store.transferRequests);
}

export async function POST(req: Request) {
  seedStore();
  const { sku, quantity, from, to } = await req.json();

  if (!sku || !quantity || !from || !to) {
    return NextResponse.json({ error: "sku, quantity, from, to required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const request = {
    id: store.transferRequests.length + 1,
    sku,
    quantity: Number(quantity),
    from,
    to,
    status: "pending" as const,
    createdAt: now,
    updatedAt: now,
  };

  store.transferRequests.unshift(request);
  logEvent("TRANSFER_CREATED", { id: request.id, sku, quantity: request.quantity, from, to });

  return NextResponse.json(request, { status: 201 });
}
