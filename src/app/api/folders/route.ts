import { createServerDb } from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const { data, error } = await db
    .from("folders")
    .select("*")
    .eq("user_id", user.sub)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const body = await request.json();
  const { name, parent_id } = body;

  const { data, error } = await db
    .from("folders")
    .insert({ name: name || "New Folder", parent_id: parent_id || null, user_id: user.sub })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
