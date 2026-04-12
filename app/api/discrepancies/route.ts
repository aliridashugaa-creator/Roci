import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getDiscrepancies());
}

export async function POST(req: Request) {
  const { sku, expectedQty, actualQty, location, notes } = await req.json();

  if (!sku || expectedQty == null || actualQty == null || !location) {
    return NextResponse.json(
      { error: "sku, expectedQty, actualQty, location required" },
      { status: 400 }
    );
  }

  const items = await db.getDiscrepancies();
  const discrepancy = {
    id: items.length + 1,
    sku, expectedQty: Number(expectedQty), actualQty: Number(actualQty),
    location, status: "open" as const,
    notes: notes ?? "",
    createdAt: new Date().toISOString(),
  };

  items.unshift(discrepancy);
  await db.setDiscrepancies(items);
  await logEvent("DISCREPANCY_REPORTED", {
    id: discrepancy.id, sku,
    expectedQty: discrepancy.expectedQty,
    actualQty: discrepancy.actualQty,
    variance: discrepancy.actualQty - discrepancy.expectedQty,
    location,
  });

  return NextResponse.json(discrepancy, { status: 201 });
}
