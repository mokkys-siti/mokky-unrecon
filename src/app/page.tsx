import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { logout } from "./login/actions";

// Per-user authenticated page — always rendered at request time, never prerendered.
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  outlet_user: "Outlet user",
  outlet_manager: "Outlet manager",
  finance_exec: "Finance executive",
  finance_manager: "Finance manager",
  admin: "Administrator",
};

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", session.userId)
    .maybeSingle();

  const displayName = profile?.full_name ?? session.email ?? "there";
  const roleLabel = session.appRole ? ROLE_LABELS[session.appRole] : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-brand-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-brand-orange">Mokky&apos;s Unrecon</h1>
        <p className="mt-2 text-gray-700">
          Signed in as <span className="font-semibold">{displayName}</span>.
        </p>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{session.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Role (from JWT)</dt>
            <dd>
              {roleLabel ? (
                <span className="rounded-full bg-brand-green/20 px-3 py-1 font-semibold text-green-800">
                  {roleLabel}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                  No role claim
                </span>
              )}
            </dd>
          </div>
        </dl>

        {session.missingRoleClaim ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The <code>app_role</code> claim is missing from your token. Enable the
            Custom Access Token Hook in the Supabase dashboard (or confirm this
            user has an active profile), then sign in again.
          </p>
        ) : null}

        {(session.appRole === "outlet_user" ||
          session.appRole === "outlet_manager") ? (
          <Link
            href="/outlet"
            className="mt-6 block rounded-lg bg-brand-orange px-4 py-2 text-center text-sm font-semibold text-white transition hover:brightness-95"
          >
            Open my cases
          </Link>
        ) : null}

        {(session.appRole === "admin" ||
          session.appRole === "finance_exec" ||
          session.appRole === "finance_manager") ? (
          <Link
            href="/finance"
            className="mt-6 block rounded-lg bg-brand-orange px-4 py-2 text-center text-sm font-semibold text-white transition hover:brightness-95"
          >
            Open finance desk
          </Link>
        ) : null}

        {session.appRole === "admin" ? (
          <Link
            href="/admin"
            className="mt-3 block rounded-lg border border-brand-orange px-4 py-2 text-center text-sm font-semibold text-brand-orange transition hover:bg-brand-orange/5"
          >
            Open admin configuration
          </Link>
        ) : null}

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
