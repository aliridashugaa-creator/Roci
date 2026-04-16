import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { StockEntry } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getStock());
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<StockEntry>;
  if (!body.skuId || !body.location?.trim()) {
    return NextResponse.json({ error: "skuId and location are required" }, { status: 400 });
  }
  const stock = await db.getStock();
  const existing = stock.find((s) => s.skuId === body.skuId && s.location === body.location);
  if (existing) {
    existing.quantity = (existing.quantity ?? 0) + (body.quantity ?? 0);
    existing.updatedAt = new Date().toISOString();
    await db.setStock(stock);
    return NextResponse.json(existing);
  }
  const now = new Date().toISOString();
  const entry: StockEntry = {
    id: `stk_${Date.now()}`,
    skuId: body.skuId,
    location: body.location.trim(),
    quantity: body.quantity ?? 0,
    reservedQty: body.reservedQty ?? 0,
    lastCountDate: body.lastCountDate ?? now,
    updatedAt: now,
  };
  stock.unshift(entry);
  await db.setStock(stock);
  return NextResponse.json(entry, { status: 201 });
}
