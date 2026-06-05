import { createServerDb } from "@/lib/db";
import { getUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUserFromCookies();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServerDb();
  const body = await request.json();
  const { name } = body;

  const { data, error } = await db
    .from("folders")
    .update({ name })
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
  const { error } = await db
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.sub);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
