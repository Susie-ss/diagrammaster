import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerDb } from "@/lib/db";
import { signToken, setTokenCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    const db = createServerDb();

    const { data: user } = await db
      .from("users")
      .select("id, username, password_hash, created_at")
      .eq("username", username.trim())
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const token = await signToken({ sub: user.id, username: user.username });
    await setTokenCookie(token);

    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
