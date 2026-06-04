import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a placeholder client during build; auth calls will fail safely at runtime
    if (typeof window === "undefined") {
      return createBrowserClient("https://placeholder.supabase.co", "placeholder-key");
    }
    throw new Error(
      "缺少 Supabase 环境变量。请设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(url, key);
}
