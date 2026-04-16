import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TransportJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getTransport());
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<TransportJob>;
  if (!body.origin?.trim() || !body.destination?.trim()) {
    return NextResponse.json({ error: "origin and destination are required" }, { status: 400 });
  }
  const jobs = await db.getTransport();
  const now = new Date().toISOString();
  const autoRef = `TRN-${String(jobs.length + 1).padStart(4, "0")}`;
  const job: TransportJob = {
    id: `trn_${Date.now()}`,
    ref: body.ref ?? autoRef,
    items: body.items ?? [],
    origin: body.origin.trim(),
    destination: body.destination.trim(),
    driver: body.driver ?? "",
    trackingRef: body.trackingRef ?? "",
    status: body.status ?? "pending",
    scheduledDate: body.scheduledDate ?? null,
    deliveredDate: body.deliveredDate ?? null,
    notes: body.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  jobs.unshift(job);
  await db.setTransport(jobs);
  return NextResponse.json(job, { status: 201 });
}
