import { createBrowserClient } from "@supabase/ssr";

const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a placeholder client so the app doesn't crash when Supabase isn't configured yet.
    // Auth/database features will silently fail until real credentials are set.
    return createBrowserClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }

  return createBrowserClient(url, key);
}

export function hasSupabaseConfig() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
