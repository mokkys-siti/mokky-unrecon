import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isOutletRole } from "@/lib/auth/roles";
import { logout } from "../login/actions";

// Outlet app — mobile-first. Outlet staff work on phones.
export const dynamic = "force-dynamic";

export default async function OutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.appRole || !isOutletRole(session.appRole)) {
    // Send finance/admin to their own areas.
    if (session.appRole === "admin") redirect("/admin");
    redirect("/finance");
  }

  return (
    <div className="min-h-screen bg-brand-buttercream/40">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-brand-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/outlet" className="font-bold text-brand-orange">
            Mokky&apos;s Cases
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm font-medium text-gray-500">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
    </div>
  );
}
