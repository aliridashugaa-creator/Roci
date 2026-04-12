import { NextResponse } from "next/server";
import store, { seedStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  seedStore();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  return NextResponse.json(store.transactions.slice(0, limit));
}
