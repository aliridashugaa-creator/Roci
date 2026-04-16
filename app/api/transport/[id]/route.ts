import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TransportJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Partial<TransportJob>;
  const jobs = await db.getTransport();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  jobs[idx] = { ...jobs[idx], ...body, id, updatedAt: new Date().toISOString() };
  await db.setTransport(jobs);
  return NextResponse.json(jobs[idx]);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobs = await db.getTransport();
  const filtered = jobs.filter((j) => j.id !== id);
  if (filtered.length === jobs.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.setTransport(filtered);
  return NextResponse.json({ ok: true });
}
