import { describe, it, expect } from "vitest";
import { anonClient, serviceClient, signInAs, userIdForFixture } from "./helpers";
import { FIXTURES } from "../fixtures";

/**
 * Phase 0 RLS gate. profiles is the one RLS-protected table proving the
 * JWT -> role -> policy loop. All calls hit the REST API directly with a real
 * JWT per role.
 */
describe("RLS: profiles", () => {
  it("an outlet user reads exactly their own profile row", async () => {
    const { client, userId } = await signInAs("obj_user");
    const { data, error } = await client.from("profiles").select("id, role");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(userId);
  });

  it("an outlet user cannot read another user's profile", async () => {
    const { client } = await signInAs("obj_user");
    const otherId = await userIdForFixture("obt_user");

    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("id", otherId);

    expect(error).toBeNull(); // RLS returns zero rows, not an error
    expect(data).toHaveLength(0);
  });

  it("an unauthenticated request returns no rows", async () => {
    const { data, error } = await anonClient().from("profiles").select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("an admin reads all profiles (proves the app_role claim works)", async () => {
    const { client } = await signInAs("admin");
    const { data, error } = await client.from("profiles").select("id");

    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(FIXTURES.length);
  });

  it("an outlet user cannot escalate their own role", async () => {
    const { client, userId } = await signInAs("obj_user");

    // No UPDATE policy matches a non-admin, so this affects zero rows silently.
    await client.from("profiles").update({ role: "admin" }).eq("id", userId);

    const { data } = await serviceClient()
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    expect(data?.role).toBe("outlet_user");
  });
});
