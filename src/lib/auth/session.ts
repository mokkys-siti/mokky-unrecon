import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "./roles";

export type SessionInfo = {
  userId: string;
  email: string | null;
  /** From the `app_role` JWT claim (injected by the custom access token hook). */
  appRole: AppRole | null;
  /** True when authenticated but no valid app_role claim was present. */
  missingRoleClaim: boolean;
};

/**
 * Returns the current authenticated session with the app role decoded from the
 * verified JWT, or null if unauthenticated. `appRole` is null (and
 * `missingRoleClaim` true) when the custom access token hook is not yet
 * enabled or the user has no profile row — surface that, don't assume a role.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.auth.getClaims();
  const rawRole = data?.claims?.app_role;
  const appRole = isAppRole(rawRole) ? (rawRole as AppRole) : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    appRole,
    missingRoleClaim: appRole === null,
  };
}
