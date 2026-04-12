import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();
  return NextResponse.json(Array.from(store.palletLocations.values()));
}

export async function PATCH(req: Request) {
  seedStore();
  const { palletId, newLocation } = await req.json();

  if (!palletId || !newLocation) {
    return NextResponse.json({ error: "palletId, newLocation required" }, { status: 400 });
  }

  const pallet = store.palletLocations.get(palletId);
  if (!pallet) {
    return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
  }

  const oldLocation = pallet.location;
  pallet.location = newLocation;
  pallet.lastMoved = new Date().toISOString();

  logEvent("PALLET_MOVE", { palletId, from: oldLocation, to: newLocation });

  return NextResponse.json({ status: "updated", palletId, location: newLocation });
}
