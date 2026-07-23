import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { serviceClient, signInAs, userIdForFixture } from "./helpers";

// Verifies the outlet response model: outlets insert a case_response (never
// update the case), a trigger transitions the case to 'outlet_responded' and
// logs an event, outlets cannot set a status directly, cannot answer another
// outlet's case, and case_events is immutable.

const svc = serviceClient();
const made = { batches: [] as string[], cases: [] as string[] };

async function outletId(code: string) {
  const { data } = await svc.from("outlets").select("id").eq("code", code).single();
  return data!.id as string;
}
async function reasonId() {
  const { data } = await svc.from("reason_codes").select("id").eq("code", "OT_UNKNOWN").single();
  return data!.id as string;
}
async function makeCase(outlet: string, visible = true) {
  const { data: b } = await svc
    .from("recon_batches")
    .insert({ outlet_id: outlet, status: "published", period_label: "RESPTEST" })
    .select("id")
    .single();
  made.batches.push(b!.id);
  const { data: c } = await svc
    .from("unrecon_cases")
    .insert({
      case_key: `RESPTEST_${made.cases.length}_${outlet.slice(0, 8)}`,
      batch_id: b!.id,
      first_seen_batch_id: b!.id,
      outlet_id: outlet,
      gateway_code: "MBBQR",
      case_type: "BILL_NO_PAYMENT",
      classification: "OPEN",
      outlet_visible: visible,
      status: "open",
      pos_amount: 10,
    })
    .select("id")
    .single();
  made.cases.push(c!.id);
  return c!.id as string;
}

let objCaseA = "";
let objCaseB = "";
let obtCase = "";

beforeAll(async () => {
  const obj = await outletId("OBJ");
  const obt = await outletId("OBT");
  objCaseA = await makeCase(obj);
  objCaseB = await makeCase(obj);
  obtCase = await makeCase(obt);
});

afterAll(async () => {
  if (made.cases.length) await svc.from("unrecon_cases").delete().in("id", made.cases);
  if (made.batches.length) await svc.from("recon_batches").delete().in("id", made.batches);
});

describe("RLS: outlet responses", () => {
  it("an outlet response transitions the case and logs an event", async () => {
    const { client } = await signInAs("obj_user");
    const uid = await userIdForFixture("obj_user");
    const { error } = await client.from("case_responses").insert({
      case_id: objCaseA,
      user_id: uid,
      reason_code_id: await reasonId(),
      remarks: "test response",
    });
    expect(error).toBeNull();

    const { data: c } = await svc.from("unrecon_cases").select("status, reason_code_id").eq("id", objCaseA).single();
    expect(c?.status).toBe("outlet_responded");
    expect(c?.reason_code_id).not.toBeNull();

    const { count } = await svc.from("case_events").select("*", { count: "exact", head: true }).eq("case_id", objCaseA).eq("event_type", "outlet_responded");
    expect(count).toBe(1);
  });

  it("an outlet cannot set a case status directly", async () => {
    const { client } = await signInAs("obj_user");
    await client.from("unrecon_cases").update({ status: "closed" }).eq("id", objCaseB);
    const { data } = await svc.from("unrecon_cases").select("status").eq("id", objCaseB).single();
    expect(data?.status).toBe("open"); // unchanged — no outlet UPDATE policy
  });

  it("an outlet cannot answer another outlet's case", async () => {
    const { client } = await signInAs("obj_user");
    const uid = await userIdForFixture("obj_user");
    const { error } = await client.from("case_responses").insert({
      case_id: obtCase,
      user_id: uid,
      reason_code_id: await reasonId(),
    });
    expect(error).not.toBeNull();
  });

  it("case_events cannot be updated or deleted by an outlet", async () => {
    const { client } = await signInAs("obj_user");
    const { data: ev } = await svc.from("case_events").select("id").eq("case_id", objCaseA).limit(1).single();
    const upd = await client.from("case_events").update({ event_type: "hacked" }).eq("id", ev!.id).select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const del = await client.from("case_events").delete().eq("id", ev!.id).select("id");
    expect(del.data ?? []).toHaveLength(0);
    const { data: still } = await svc.from("case_events").select("event_type").eq("id", ev!.id).single();
    expect(still?.event_type).toBe("outlet_responded");
  });
});
