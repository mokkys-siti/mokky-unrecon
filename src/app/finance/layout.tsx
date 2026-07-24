import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole } from "@/lib/auth/roles";
import { AppShell } from "@/components/app-shell";

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

  return <AppShell>{children}</AppShell>;
}
