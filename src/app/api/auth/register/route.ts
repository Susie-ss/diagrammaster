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

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要6个字符" }, { status: 400 });
    }

    const trimmedUser = username.trim();
    if (trimmedUser.length < 2 || trimmedUser.length > 30) {
      return NextResponse.json({ error: "用户名需要2-30个字符" }, { status: 400 });
    }

    const db = createServerDb();

    // Check if username already exists
    const { data: existing } = await db
      .from("users")
      .select("id")
      .eq("username", trimmedUser)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
    }

    // Hash password and create user
    const password_hash = await bcrypt.hash(password, 10);
    const { data: user, error } = await db
      .from("users")
      .insert({ username: trimmedUser, password_hash })
      .select("id, username, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
    }

    // Auto-login: sign token and set cookie
    const token = await signToken({ sub: user.id, username: user.username });
    await setTokenCookie(token);

    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
