/**
 * Idempotent fixture-user seeder. Uses the Supabase service-role key (bypasses
 * RLS) to create auth users + profiles for the RLS test fixtures.
 *
 * Run: pnpm seed:users
 *
 * Creates auth.users + public.profiles, and links user_outlets from each
 * fixture's outletCodes (looked up by code — the natural key).
 */
import { config } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";
import { FIXTURES } from "../tests/fixtures";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email: string): Promise<User | null> {
  // Page through auth users (fixture count is tiny, but be correct).
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log(`Seeding ${FIXTURES.length} fixture users into ${url}`);

  for (const f of FIXTURES) {
    const existing = await findUserByEmail(f.email);

    let userId: string;
    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(
        existing.id,
        { password: f.password, email_confirm: true },
      );
      if (error) throw error;
      userId = data.user.id;
      console.log(`  ~ updated auth user ${f.email}`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: f.email,
        password: f.password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
      console.log(`  + created auth user ${f.email}`);
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: f.fullName,
        email: f.email,
        role: f.role,
        is_active: true,
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;
    console.log(`    profile: ${f.role}`);

    // Link the fixture's outlets (by code -> id). Idempotent upsert.
    if (f.outletCodes.length > 0) {
      const { data: outlets, error: outletsError } = await admin
        .from("outlets")
        .select("id, code")
        .in("code", f.outletCodes);
      if (outletsError) throw outletsError;

      const missing = f.outletCodes.filter(
        (c) => !outlets?.some((o) => o.code === c),
      );
      if (missing.length) {
        throw new Error(
          `Outlet code(s) not found for ${f.email}: ${missing.join(", ")}. ` +
            "Push the reference migrations first.",
        );
      }

      const rows = (outlets ?? []).map((o) => ({
        user_id: userId,
        outlet_id: o.id,
      }));
      const { error: linkError } = await admin
        .from("user_outlets")
        .upsert(rows, { onConflict: "user_id,outlet_id" });
      if (linkError) throw linkError;
      console.log(`    outlets: ${f.outletCodes.join(", ")}`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
