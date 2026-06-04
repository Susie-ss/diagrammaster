import { createClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow auth pages and API routes
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!user) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
