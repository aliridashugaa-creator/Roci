import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Supplier } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Partial<Supplier>;
  const suppliers = await db.getSuppliers();
  const idx = suppliers.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  suppliers[idx] = { ...suppliers[idx], ...body, id, updatedAt: new Date().toISOString() };
  await db.setSuppliers(suppliers);
  return NextResponse.json(suppliers[idx]);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suppliers = await db.getSuppliers();
  const filtered = suppliers.filter((s) => s.id !== id);
  if (filtered.length === suppliers.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.setSuppliers(filtered);
  return NextResponse.json({ ok: true });
}
