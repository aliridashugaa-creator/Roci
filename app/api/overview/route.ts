import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [skus, suppliers, stock, projects, transport] = await Promise.all([
    db.getSKUs(), db.getSuppliers(), db.getStock(), db.getProjects(), db.getTransport(),
  ]);

  const activeSkus = skus.filter((s) => s.status === "active").length;
  const totalStockValue = stock.reduce((sum, entry) => {
    const sku = skus.find((s) => s.id === entry.skuId);
    return sum + entry.quantity * (sku?.costPrice ?? 0);
  }, 0);

  const lowStock = stock.filter((entry) => {
    const sku = skus.find((s) => s.id === entry.skuId);
    return sku?.minStockLevel != null && entry.quantity <= sku.minStockLevel;
  }).length;

  return NextResponse.json({
    totalSKUs: skus.length,
    activeSKUs: activeSkus,
    inactiveSKUs: skus.filter((s) => s.status === "inactive").length,
    discontinuedSKUs: skus.filter((s) => s.status === "discontinued").length,
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter((s) => s.status === "active").length,
    totalStockEntries: stock.length,
    totalStockValue: Math.round(totalStockValue * 100) / 100,
    lowStockItems: lowStock,
    activeProjects: projects.filter((p) => p.status === "active").length,
    totalProjects: projects.length,
    transportPending: transport.filter((t) => t.status === "pending").length,
    transportInTransit: transport.filter((t) => t.status === "in_transit").length,
    transportDelivered: transport.filter((t) => t.status === "delivered").length,
  });
}
