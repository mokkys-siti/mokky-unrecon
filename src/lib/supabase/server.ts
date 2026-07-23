import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicSupabaseEnv } from "./env";

/**
 * Server Supabase client bound to the request's cookies. Use in Server
 * Components, Server Functions, and Route Handlers. Auth/authorization is
 * still enforced by RLS on the database — this client just carries the JWT.
 */
export async function createClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, which cannot set cookies. Safe to
          // ignore: the proxy (proxy.ts) refreshes the session cookie instead.
        }
      },
    },
  });
}
