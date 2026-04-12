import { NextResponse } from "next/server";
import store, { seedStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();

  const inventory = Array.from(store.inventory.values());
  const totalUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const activeTransfers = store.transferRequests.filter(
    (r) => r.status === "pending" || r.status === "in_transit"
  ).length;
  const openDiscrepancies = store.discrepancies.filter(
    (d) => d.status !== "resolved"
  ).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      totalSKUs: inventory.length,
      totalUnits,
      activeTransfers,
      openDiscrepancies,
    },
    inventory,
    transfers: store.transferRequests,
    discrepancies: store.discrepancies,
  });
}
