import { NextResponse } from "next/server";
import store, { seedStore, logEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  seedStore();
  return NextResponse.json(store.goodsInDocs);
}

export async function POST(req: Request) {
  seedStore();
  const { sku, quantity, supplier, palletId } = await req.json();

  if (!sku || !quantity || !supplier || !palletId) {
    return NextResponse.json(
      { error: "sku, quantity, supplier, palletId required" },
      { status: 400 }
    );
  }

  const docId = `GIN-${String(store.goodsInDocs.length + 1).padStart(3, "0")}`;
  const doc = {
    docId,
    sku,
    quantity: Number(quantity),
    supplier,
    palletId,
    receivedAt: new Date().toISOString(),
  };

  store.goodsInDocs.unshift(doc);
  logEvent("GOODS_IN_DOC", { docId, sku, quantity: Number(quantity), supplier, palletId });

  return NextResponse.json(doc, { status: 201 });
}
