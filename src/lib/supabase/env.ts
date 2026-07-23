/**
 * Public Supabase env, read once and validated. These two values are safe to
 * expose to the browser (the anon key is protected by RLS, not by secrecy).
 * The service-role key is deliberately NOT read here — it must never reach
 * client bundles. See scripts/ for server-only usage.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function requirePublicSupabaseEnv(): {
  url: string;
  anonKey: string;
} {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example).",
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}
