import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { anonClient, serviceClient, signInAs } from "./helpers";

// Verifies the case-visibility RLS: outlets see only their own outlet_visible
// cases from a PUBLISHED batch; never hidden cases, unpublished batches, or
// another outlet's cases. Finance sees all. Data is set up via the service
// role (bypasses RLS) and torn down afterward.

const KEY_PREFIX = "RLSTEST_";
const svc = serviceClient();
const created = { batches: [] as string[], cases: [] as string[] };

async function outletId(code: string): Promise<string> {
  const { data } = await svc.from("outlets").select("id").eq("code", code).single();
  return data!.id as string;
}

async function makeBatch(outlet: string, status: string): Promise<string> {
  const { data, error } = await svc
    .from("recon_batches")
    .insert({ outlet_id: outlet, status, period_label: "RLSTEST" })
    .select("id")
    .single();
  if (error) throw error;
  created.batches.push(data.id);
  return data.id;
}

async function makeCase(opts: {
  key: string;
  outlet: string;
  batch: string;
  visible: boolean;
}): Promise<void> {
  const { data, error } = await svc
    .from("unrecon_cases")
    .insert({
      case_key: KEY_PREFIX + opts.key,
      batch_id: opts.batch,
      first_seen_batch_id: opts.batch,
      outlet_id: opts.outlet,
      gateway_code: "MBBQR",
      case_type: "BILL_NO_PAYMENT",
      classification: "OPEN",
      outlet_visible: opts.visible,
      status: "open",
      pos_amount: 10,
    })
    .select("id")
    .single();
  if (error) throw error;
  created.cases.push(data.id);
}

beforeAll(async () => {
  const obj = await outletId("OBJ");
  const obt = await outletId("OBT");
  const objPub = await makeBatch(obj, "published");
  const objReview = await makeBatch(obj, "review");
  const obtPub = await makeBatch(obt, "published");

  await makeCase({ key: "visible", outlet: obj, batch: objPub, visible: true }); // obj should see
  await makeCase({ key: "hidden", outlet: obj, batch: objPub, visible: false }); // hidden
  await makeCase({ key: "unpub", outlet: obj, batch: objReview, visible: true }); // not published
  await makeCase({ key: "obt", outlet: obt, batch: obtPub, visible: true }); // other outlet
});

afterAll(async () => {
  if (created.cases.length) await svc.from("unrecon_cases").delete().in("id", created.cases);
  if (created.batches.length) await svc.from("recon_batches").delete().in("id", created.batches);
});

describe("RLS: unrecon_cases visibility", () => {
  it("an OBJ outlet user sees only their visible, published case", async () => {
    const { client } = await signInAs("obj_user");
    const { data } = await client
      .from("unrecon_cases")
      .select("case_key")
      .like("case_key", `${KEY_PREFIX}%`);
    expect(data?.map((c) => c.case_key)).toEqual([`${KEY_PREFIX}visible`]);
  });

  it("an OBJ outlet user cannot see another outlet's case", async () => {
    const { client } = await signInAs("obj_user");
    const { data } = await client
      .from("unrecon_cases")
      .select("case_key")
      .eq("case_key", `${KEY_PREFIX}obt`);
    expect(data).toHaveLength(0);
  });

  it("finance sees all test cases (all outlets, hidden, unpublished)", async () => {
    const { client } = await signInAs("finance_exec");
    const { data } = await client
      .from("unrecon_cases")
      .select("case_key")
      .like("case_key", `${KEY_PREFIX}%`);
    expect(data?.length).toBe(4);
  });

  it("an unauthenticated request sees no cases", async () => {
    const { data } = await anonClient()
      .from("unrecon_cases")
      .select("case_key")
      .like("case_key", `${KEY_PREFIX}%`);
    expect(data).toHaveLength(0);
  });
});
