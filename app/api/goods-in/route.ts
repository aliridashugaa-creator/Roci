import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getGoodsInDocs());
}

export async function POST(req: Request) {
  const { sku, quantity, supplier, palletId } = await req.json();

  if (!sku || !quantity || !supplier || !palletId) {
    return NextResponse.json(
      { error: "sku, quantity, supplier, palletId required" },
      { status: 400 }
    );
  }

  const docs = await db.getGoodsInDocs();
  const docId = `GIN-${String(docs.length + 1).padStart(3, "0")}`;
  const doc = { docId, sku, quantity: Number(quantity), supplier, palletId, receivedAt: new Date().toISOString() };

  docs.unshift(doc);
  await db.setGoodsInDocs(docs);
  await logEvent("GOODS_IN_DOC", { docId, sku, quantity: doc.quantity, supplier, palletId });

  return NextResponse.json(doc, { status: 201 });
}
