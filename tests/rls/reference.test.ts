import { describe, it, expect } from "vitest";
import { anonClient, serviceClient, signInAs } from "./helpers";

/**
 * Phase 1 RLS + seed gate for reference/config tables. Direct REST calls per
 * role. outlets/user_outlets are row-scoped; config tables are read-all,
 * admin-write.
 */
describe("Reference: seed integrity", () => {
  it("loaded the expected row counts", async () => {
    const svc = serviceClient();
    const expected: [string, number][] = [
      ["entities", 6],
      ["outlets", 10],
      ["payment_gateways", 8],
      ["reason_codes", 28],
      ["classification_rules", 5],
      ["disposition_codes", 6],
    ];
    for (const [table, n] of expected) {
      const { count, error } = await svc
        .from(table)
        .select("*", { count: "exact", head: true });
      expect(error, table).toBeNull();
      expect(count, table).toBe(n);
    }
  });

  it("FD button reason is scoped to OGD and ZGD only", async () => {
    const { data } = await serviceClient()
      .from("reason_codes")
      .select("applies_to_outlets")
      .eq("code", "GS_FD_BUTTON")
      .single();
    expect(data?.applies_to_outlets?.slice().sort()).toEqual(["OGD", "ZGD"]);
  });

  it("exactly six reasons require evidence", async () => {
    const { count } = await serviceClient()
      .from("reason_codes")
      .select("*", { count: "exact", head: true })
      .eq("requires_evidence", true);
    expect(count).toBe(6);
  });
});

describe("RLS: outlets (row-scoped)", () => {
  it("an outlet user sees exactly their one outlet", async () => {
    const { client } = await signInAs("obj_user");
    const { data, error } = await client.from("outlets").select("code");
    expect(error).toBeNull();
    expect(data?.map((o) => o.code)).toEqual(["OBJ"]);
  });

  it("an area manager sees exactly their two outlets", async () => {
    const { client } = await signInAs("area_manager");
    const { data } = await client.from("outlets").select("code");
    expect(data?.map((o) => o.code).sort()).toEqual(["OBJ", "OBT"]);
  });

  it("a finance user sees all ten outlets", async () => {
    const { client } = await signInAs("finance_exec");
    const { data } = await client.from("outlets").select("code");
    expect(data?.length).toBe(10);
  });

  it("an unauthenticated request sees no outlets", async () => {
    const { data } = await anonClient().from("outlets").select("code");
    expect(data).toHaveLength(0);
  });
});

describe("RLS: user_outlets (self-scoped)", () => {
  it("an outlet user sees only their own membership rows", async () => {
    const { client, userId } = await signInAs("obj_user");
    const { data } = await client
      .from("user_outlets")
      .select("user_id, outlet_id");
    expect(data?.length).toBe(1);
    expect(data?.every((r) => r.user_id === userId)).toBe(true);
  });
});

describe("RLS: config tables (read-all, admin-write)", () => {
  it("an outlet user can read the full reason-code vocabulary", async () => {
    const { client } = await signInAs("obj_user");
    const { data, error } = await client.from("reason_codes").select("code");
    expect(error).toBeNull();
    expect(data?.length).toBe(28);
  });

  it("an outlet user cannot insert a reason code", async () => {
    const { client } = await signInAs("obj_user");
    const { error } = await client
      .from("reason_codes")
      .insert({ code: "HACK_TEST", label: "should be blocked" });
    expect(error).not.toBeNull();
  });

  it("an outlet user's update affects zero rows (RLS)", async () => {
    const { client } = await signInAs("obj_user");
    const { data } = await client
      .from("reason_codes")
      .update({ sort_order: 999 })
      .eq("code", "OT_UNKNOWN")
      .select("code");
    expect(data ?? []).toHaveLength(0);
  });

  it("an admin can update a reason code (and it persists)", async () => {
    const { client } = await signInAs("admin");
    const { data, error } = await client
      .from("reason_codes")
      .update({ sort_order: 100 })
      .eq("code", "OT_UNKNOWN")
      .select("code, sort_order");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.sort_order).toBe(100);

    // revert so the suite is idempotent
    await client
      .from("reason_codes")
      .update({ sort_order: 28 })
      .eq("code", "OT_UNKNOWN");
  });
});
