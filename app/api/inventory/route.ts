import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getInventory());
}

export async function POST(req: Request) {
  const { sku, quantity, palletId } = await req.json();

  if (!sku || !quantity || !palletId) {
    return NextResponse.json({ error: "sku, quantity, palletId required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const inventory = await db.getInventory();
  const existing = inventory.find((i) => i.sku === sku);
  const newQty = (existing?.quantity ?? 0) + Number(quantity);

  if (existing) {
    existing.quantity = newQty;
    existing.lastUpdated = now;
  } else {
    inventory.push({ sku, quantity: newQty, lastUpdated: now });
  }
  await db.setInventory(inventory);

  const pallets = await db.getPallets();
  const pallet = pallets.find((p) => p.palletId === palletId);
  if (pallet) {
    pallet.location = "RECEIVING";
    pallet.lastMoved = now;
  } else {
    pallets.push({ palletId, location: "RECEIVING", sku, lastMoved: now });
  }
  await db.setPallets(pallets);

  await logEvent("STOCK_ARRIVAL", { sku, quantity: Number(quantity), palletId, totalNow: newQty });
  return NextResponse.json({ status: "confirmed", sku, newQty });
}
