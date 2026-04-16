import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SKU } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getSKUs());
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<SKU>;
  if (!body.code?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }
  const skus = await db.getSKUs();
  if (skus.find((s) => s.code.toLowerCase() === body.code!.toLowerCase())) {
    return NextResponse.json({ error: "SKU code already exists" }, { status: 409 });
  }
  const now = new Date().toISOString();
  const sku: SKU = {
    id: `sku_${Date.now()}`,
    code: body.code.toUpperCase().trim(),
    name: body.name.trim(),
    description: body.description ?? "",
    category: body.category ?? "",
    subcategory: body.subcategory ?? "",
    supplierId: body.supplierId ?? "",
    supplierCode: body.supplierCode ?? "",
    unitOfMeasure: body.unitOfMeasure ?? "each",
    costPrice: body.costPrice ?? null,
    salePrice: body.salePrice ?? null,
    weight: body.weight ?? null,
    dimensions: body.dimensions ?? "",
    barcode: body.barcode ?? "",
    minStockLevel: body.minStockLevel ?? null,
    reorderPoint: body.reorderPoint ?? null,
    leadTimeDays: body.leadTimeDays ?? null,
    status: body.status ?? "active",
    notes: body.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  skus.unshift(sku);
  await db.setSKUs(skus);
  return NextResponse.json(sku, { status: 201 });
}
