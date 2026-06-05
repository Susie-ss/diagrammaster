import { createServerDb } from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const { data, error } = await db
    .from("projects")
    .select("*")
    .eq("user_id", user.sub)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const body = await request.json();
  const { name, mode, folder_id, diagram_data } = body;

  const { data, error } = await db
    .from("projects")
    .insert({
      name: name || "Untitled",
      mode: mode || "flowchart",
      folder_id: folder_id || null,
      diagram_data: diagram_data || { nodes: [], conns: [], paths: [] },
      user_id: user.sub,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
