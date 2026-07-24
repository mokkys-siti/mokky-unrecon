import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";

// Admin-only area. Convenience gating; RLS is the real enforcement.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.appRole !== "admin") redirect("/");

  return <AppShell>{children}</AppShell>;
}
