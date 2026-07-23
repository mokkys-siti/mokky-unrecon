import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed `middleware` to `proxy` (Node.js runtime by default).
// This refreshes the Supabase session cookie on every matched request and
// gates access. NOTE: this is convenience routing only — the real access
// enforcement is RLS on the database. Never rely on the proxy for security.

const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Unauthenticated hitting a protected page -> send to login.
  if (!user && !isPublic(pathname)) {
    return redirectPreservingCookies(request, "/login", response);
  }

  // Authenticated hitting the login page -> send home.
  if (user && pathname === "/login") {
    return redirectPreservingCookies(request, "/", response);
  }

  return response;
}

/** Redirect while carrying over any auth cookies the session refresh set. */
function redirectPreservingCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectRes = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirectRes.cookies.set(cookie));
  return redirectRes;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
