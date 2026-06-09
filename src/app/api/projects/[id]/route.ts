import { createServerDb } from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.sub)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const body = await request.json();
  const { name, diagram_data, mode, folder_id } = body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (diagram_data !== undefined) update.diagram_data = diagram_data;
  if (mode !== undefined) update.mode = mode;
  if (folder_id !== undefined) update.folder_id = folder_id;

  const { data, error } = await db
    .from("projects")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.sub)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const { error } = await db.from("projects").delete().eq("id", id).eq("user_id", user.sub);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
