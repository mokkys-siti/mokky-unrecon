import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requirePublicSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase auth session on every matched request and returns the
 * current user. Called from proxy.ts (Next.js 16's renamed middleware).
 *
 * Do not run auth logic between creating the client and calling getUser():
 * a subtle bug there can log users out at random. Keep it minimal.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: Awaited<ReturnType<typeof getUserSafely>>;
}> {
  const { url, anonKey } = requirePublicSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const user = await getUserSafely(supabase);
  return { response, user };
}

async function getUserSafely(
  supabase: ReturnType<typeof createServerClient>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
