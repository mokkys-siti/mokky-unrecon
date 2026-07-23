"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicSupabaseEnv } from "./env";

/** Browser Supabase client. Every request carries the user's JWT; RLS enforces access. */
export function createClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
