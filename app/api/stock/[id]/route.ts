import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { StockEntry } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Partial<StockEntry>;
  const stock = await db.getStock();
  const idx = stock.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  stock[idx] = { ...stock[idx], ...body, id, updatedAt: new Date().toISOString() };
  await db.setStock(stock);
  return NextResponse.json(stock[idx]);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stock = await db.getStock();
  const filtered = stock.filter((s) => s.id !== id);
  if (filtered.length === stock.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.setStock(filtered);
  return NextResponse.json({ ok: true });
}
