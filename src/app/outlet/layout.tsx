import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isOutletRole } from "@/lib/auth/roles";
import { AppShell } from "@/components/app-shell";

// Outlet app — mobile-first. The sidebar collapses to a top bar on phones.
export const dynamic = "force-dynamic";

export default async function OutletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.appRole || !isOutletRole(session.appRole)) {
    if (session.appRole === "admin") redirect("/admin");
    redirect("/finance");
  }

  return <AppShell narrow>{children}</AppShell>;
}
