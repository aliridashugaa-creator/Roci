import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getPallets());
}

export async function PATCH(req: Request) {
  const { palletId, newLocation } = await req.json();

  if (!palletId || !newLocation) {
    return NextResponse.json({ error: "palletId, newLocation required" }, { status: 400 });
  }

  const pallets = await db.getPallets();
  const pallet = pallets.find((p) => p.palletId === palletId);
  if (!pallet) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  const oldLocation = pallet.location;
  pallet.location = newLocation;
  pallet.lastMoved = new Date().toISOString();
  await db.setPallets(pallets);

  await logEvent("PALLET_MOVE", { palletId, from: oldLocation, to: newLocation });
  return NextResponse.json({ status: "updated", palletId, location: newLocation });
}
