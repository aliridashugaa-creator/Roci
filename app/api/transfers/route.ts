import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getTransfers());
}

export async function POST(req: Request) {
  const { sku, quantity, from, to } = await req.json();

  if (!sku || !quantity || !from || !to) {
    return NextResponse.json({ error: "sku, quantity, from, to required" }, { status: 400 });
  }

  const transfers = await db.getTransfers();
  const now = new Date().toISOString();
  const request = {
    id: transfers.length + 1,
    sku, quantity: Number(quantity), from, to,
    status: "pending" as const,
    createdAt: now, updatedAt: now,
  };

  transfers.unshift(request);
  await db.setTransfers(transfers);
  await logEvent("TRANSFER_CREATED", { id: request.id, sku, quantity: request.quantity, from, to });

  return NextResponse.json(request, { status: 201 });
}
