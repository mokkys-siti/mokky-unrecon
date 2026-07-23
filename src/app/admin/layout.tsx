import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { logout } from "../login/actions";

// Admin-only area. This is convenience gating; RLS is the real enforcement —
// every write still passes through is_admin() policies on the database.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.appRole !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-brand-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-brand-orange">
              Mokky&apos;s Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/admin/reason-codes"
                className="text-gray-600 hover:text-brand-orange"
              >
                Reason codes
              </Link>
              <Link
                href="/admin/classification-rules"
                className="text-gray-600 hover:text-brand-orange"
              >
                Classification rules
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
