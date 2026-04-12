import { NextResponse } from "next/server";
import { db, seedIfNeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await seedIfNeeded();

  const [inventory, transfers, discrepancies] = await Promise.all([
    db.getInventory(),
    db.getTransfers(),
    db.getDiscrepancies(),
  ]);

  const totalUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const activeTransfers = transfers.filter((r) => ["pending", "in_transit"].includes(r.status)).length;
  const openDiscrepancies = discrepancies.filter((d) => d.status !== "resolved").length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: { totalSKUs: inventory.length, totalUnits, activeTransfers, openDiscrepancies },
    inventory,
    transfers,
    discrepancies,
  });
}
