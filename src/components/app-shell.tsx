import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";

/**
 * Authenticated app shell: a fixed left sidebar (role-aware nav) + main content.
 * Layouts still enforce the role guard; this just renders the chrome.
 */
export async function AppShell({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  const session = await getSession();
  let name = session?.email ?? "";
  if (session) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle();
    name = profile?.full_name ?? session.email ?? "";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar name={name} email={session?.email ?? null} role={session?.appRole ?? null} />
      <div className="lg:pl-64">
        <main className={`mx-auto px-4 py-6 lg:px-8 ${narrow ? "max-w-lg" : "max-w-6xl"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
