import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();
  return NextResponse.json(Array.from(store.inventory.values()));
}

export async function POST(req: Request) {
  seedStore();
  const { sku, quantity, palletId } = await req.json();

  if (!sku || !quantity || !palletId) {
    return NextResponse.json({ error: "sku, quantity, palletId required" }, { status: 400 });
  }

  const existing = store.inventory.get(sku);
  const newQty = (existing?.quantity ?? 0) + Number(quantity);
  const now = new Date().toISOString();

  store.inventory.set(sku, { sku, quantity: newQty, lastUpdated: now });
  store.palletLocations.set(palletId, { palletId, location: "RECEIVING", sku, lastMoved: now });

  logEvent("STOCK_ARRIVAL", { sku, quantity: Number(quantity), palletId, totalNow: newQty });

  return NextResponse.json({ status: "confirmed", sku, newQty });
}
