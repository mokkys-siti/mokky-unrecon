/** App-level roles. Mirrors the profiles.role CHECK constraint in migration 0001. */
export const APP_ROLES = [
  "outlet_user",
  "outlet_manager",
  "finance_exec",
  "finance_manager",
  "admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" && (APP_ROLES as readonly string[]).includes(value)
  );
}

export const OUTLET_ROLES: readonly AppRole[] = ["outlet_user", "outlet_manager"];
export const FINANCE_ROLES: readonly AppRole[] = [
  "finance_exec",
  "finance_manager",
];

export function isOutletRole(role: AppRole): boolean {
  return OUTLET_ROLES.includes(role);
}

export function isFinanceRole(role: AppRole): boolean {
  return FINANCE_ROLES.includes(role);
}
