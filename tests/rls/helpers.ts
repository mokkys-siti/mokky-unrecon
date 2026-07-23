import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fixture } from "../fixtures";

/**
 * RLS test clients. These deliberately talk to the Supabase REST API directly
 * with a real per-role JWT — bypassing the app's own data layer — because the
 * app layer can be bypassed by anyone with a token; only RLS cannot.
 */
function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env.local before running the RLS tests.`,
    );
  }
  return value;
}

const noPersist = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/** Anonymous (unauthenticated) client — carries only the anon key. */
export function anonClient(): SupabaseClient {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    noPersist,
  );
}

/** Service-role client — bypasses RLS. Used only to set up / verify test state. */
export function serviceClient(): SupabaseClient {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    noPersist,
  );
}

/** A client authenticated as the given fixture user (real JWT). */
export async function signInAs(
  key: string,
): Promise<{ client: SupabaseClient; userId: string }> {
  const f = fixture(key);
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: f.email,
    password: f.password,
  });
  if (error) {
    throw new Error(`Sign-in failed for fixture "${key}": ${error.message}`);
  }
  return { client, userId: data.user.id };
}

/** Look up a fixture user's id via the service client (bypasses RLS). */
export async function userIdForFixture(key: string): Promise<string> {
  const f = fixture(key);
  const { data, error } = await serviceClient()
    .from("profiles")
    .select("id")
    .eq("email", f.email)
    .single();
  if (error) throw error;
  return data.id as string;
}
