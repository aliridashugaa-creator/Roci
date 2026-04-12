import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();
  return NextResponse.json(store.discrepancies);
}

export async function POST(req: Request) {
  seedStore();
  const { sku, expectedQty, actualQty, location, notes } = await req.json();

  if (!sku || expectedQty == null || actualQty == null || !location) {
    return NextResponse.json(
      { error: "sku, expectedQty, actualQty, location required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const discrepancy = {
    id: store.discrepancies.length + 1,
    sku,
    expectedQty: Number(expectedQty),
    actualQty: Number(actualQty),
    location,
    status: "open" as const,
    notes: notes ?? "",
    createdAt: now,
  };

  store.discrepancies.unshift(discrepancy);
  logEvent("DISCREPANCY_REPORTED", {
    id: discrepancy.id,
    sku,
    expectedQty: discrepancy.expectedQty,
    actualQty: discrepancy.actualQty,
    variance: discrepancy.actualQty - discrepancy.expectedQty,
    location,
  });

  return NextResponse.json(discrepancy, { status: 201 });
}
