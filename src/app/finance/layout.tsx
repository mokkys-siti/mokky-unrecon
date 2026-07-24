import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole } from "@/lib/auth/roles";
import { logout } from "../login/actions";

// Finance desk (desktop-first). Convenience gating; RLS is the real enforcement.
export const dynamic = "force-dynamic";

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const allowed = session.appRole === "admin" || (session.appRole && isFinanceRole(session.appRole));
  if (!allowed) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-brand-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/finance" className="font-bold text-brand-orange">
              Mokky&apos;s Finance
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/finance/dashboard" className="text-gray-600 hover:text-brand-orange">
                Dashboard
              </Link>
              <Link href="/finance/upload" className="text-gray-600 hover:text-brand-orange">
                Upload
              </Link>
              <Link href="/finance/batches" className="text-gray-600 hover:text-brand-orange">
                Batches
              </Link>
              <Link href="/finance/cases" className="text-gray-600 hover:text-brand-orange">
                Cases
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-gray-500 hover:text-gray-800">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
