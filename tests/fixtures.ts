import type { AppRole } from "@/lib/auth/roles";

/**
 * Deterministic test/fixture users, shared by the seed script and the RLS
 * tests. `outletCodes` is consumed in Phase 1 (user_outlets); in Phase 0 only
 * the profile + role are created. Never use these accounts outside dev/test.
 */
export type Fixture = {
  key: string;
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
  outletCodes: string[];
};

// A single shared password keeps the seed idempotent and the tests simple.
// Override with FIXTURE_PASSWORD if a project's policy needs something stronger.
export const FIXTURE_PASSWORD =
  process.env.FIXTURE_PASSWORD ?? "Mokky-Test-Passw0rd!";

export const FIXTURES: Fixture[] = [
  {
    key: "obj_user",
    email: "obj.user@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "OBJ Outlet User",
    role: "outlet_user",
    outletCodes: ["OBJ"],
  },
  {
    key: "obt_user",
    email: "obt.user@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "OBT Outlet User",
    role: "outlet_user",
    outletCodes: ["OBT"],
  },
  {
    key: "area_manager",
    email: "area.manager@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "Area Manager (OBJ+OBT)",
    role: "outlet_manager",
    outletCodes: ["OBJ", "OBT"],
  },
  {
    key: "finance_exec",
    email: "finance.exec@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "Finance Executive",
    role: "finance_exec",
    outletCodes: [],
  },
  {
    key: "finance_manager",
    email: "finance.manager@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "Finance Manager",
    role: "finance_manager",
    outletCodes: [],
  },
  {
    key: "admin",
    email: "admin@mokky.test",
    password: FIXTURE_PASSWORD,
    fullName: "Administrator",
    role: "admin",
    outletCodes: [],
  },
];

export function fixture(key: string): Fixture {
  const f = FIXTURES.find((x) => x.key === key);
  if (!f) throw new Error(`Unknown fixture: ${key}`);
  return f;
}
