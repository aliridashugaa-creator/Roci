import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Project } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await db.getProjects());
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<Project>;
  if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const now = new Date().toISOString();
  const project: Project = {
    id: `prj_${Date.now()}`,
    name: body.name.trim(),
    description: body.description ?? "",
    status: body.status ?? "planning",
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
    items: body.items ?? [],
    notes: body.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  const projects = await db.getProjects();
  projects.unshift(project);
  await db.setProjects(projects);
  return NextResponse.json(project, { status: 201 });
}
