import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SKU } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sku = (await db.getSKUs()).find((s) => s.id === id);
  return sku ? NextResponse.json(sku) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Partial<SKU>;
  const skus = await db.getSKUs();
  const idx = skus.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  skus[idx] = { ...skus[idx], ...body, id, updatedAt: new Date().toISOString() };
  await db.setSKUs(skus);
  return NextResponse.json(skus[idx]);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skus = await db.getSKUs();
  const filtered = skus.filter((s) => s.id !== id);
  if (filtered.length === skus.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.setSKUs(filtered);
  return NextResponse.json({ ok: true });
}
