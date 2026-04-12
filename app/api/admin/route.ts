import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [inventory, pallets, loads, transfers, discrepancies, goodsInDocs, transactions] =
    await Promise.all([
      db.getInventory(),
      db.getPallets(),
      db.getLoads(),
      db.getTransfers(),
      db.getDiscrepancies(),
      db.getGoodsInDocs(),
      db.getTransactions(),
    ]);

  return NextResponse.json({
    counts: {
      inventory:    inventory.length,
      pallets:      pallets.length,
      loads:        loads.length,
      transfers:    transfers.length,
      discrepancies:discrepancies.length,
      goodsInDocs:  goodsInDocs.length,
      transactions: transactions.length,
    },
    inventory,
    pallets,
    loads,
    transfers,
    discrepancies,
    goodsInDocs,
    transactions,
  });
}

export async function DELETE() {
  await db.clearAll();
  return NextResponse.json({ status: "cleared" });
}
