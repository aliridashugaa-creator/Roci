import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Project } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as Partial<Project>;
  const projects = await db.getProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  projects[idx] = { ...projects[idx], ...body, id, updatedAt: new Date().toISOString() };
  await db.setProjects(projects);
  return NextResponse.json(projects[idx]);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projects = await db.getProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.setProjects(filtered);
  return NextResponse.json({ ok: true });
}
