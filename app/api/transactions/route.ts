import { NextResponse } from "next/server";
import { db, seedIfNeeded } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await seedIfNeeded();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const txns = await db.getTransactions();
  return NextResponse.json(txns.slice(0, limit));
}
