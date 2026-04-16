import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Supplier } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getSuppliers());
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<Supplier>;
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const now = new Date().toISOString();
  const supplier: Supplier = {
    id: `sup_${Date.now()}`,
    name: body.name.trim(),
    contactName: body.contactName ?? "",
    email: body.email ?? "",
    phone: body.phone ?? "",
    address: body.address ?? "",
    country: body.country ?? "",
    leadTimeDays: body.leadTimeDays ?? 0,
    paymentTerms: body.paymentTerms ?? "",
    currency: body.currency ?? "GBP",
    status: body.status ?? "active",
    notes: body.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const suppliers = await db.getSuppliers();
  suppliers.unshift(supplier);
  await db.setSuppliers(suppliers);
  return NextResponse.json(supplier, { status: 201 });
}
