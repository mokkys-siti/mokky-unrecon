import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { serviceClient, signInAs } from "./helpers";

// Close rights: finance_exec may write cases but NOT set status='closed';
// only finance_manager/admin can (enforced by RLS WITH CHECK in 0021).

const svc = serviceClient();
const made = { batches: [] as string[], cases: [] as string[] };

async function makeRespondedCase(): Promise<string> {
  const { data: obj } = await svc.from("outlets").select("id").eq("code", "OBJ").single();
  const { data: b } = await svc
    .from("recon_batches")
    .insert({ outlet_id: obj!.id, status: "published", period_label: "CLOSETEST" })
    .select("id")
    .single();
  made.batches.push(b!.id);
  const { data: c } = await svc
    .from("unrecon_cases")
    .insert({
      case_key: `CLOSETEST_${made.cases.length}`,
      batch_id: b!.id,
      first_seen_batch_id: b!.id,
      outlet_id: obj!.id,
      gateway_code: "MBBQR",
      case_type: "BILL_NO_PAYMENT",
      classification: "OPEN",
      outlet_visible: true,
      status: "outlet_responded",
      pos_amount: 10,
    })
    .select("id")
    .single();
  made.cases.push(c!.id);
  return c!.id as string;
}

let execCase = "";
let mgrCase = "";

beforeAll(async () => {
  execCase = await makeRespondedCase();
  mgrCase = await makeRespondedCase();
});
afterAll(async () => {
  if (made.cases.length) await svc.from("unrecon_cases").delete().in("id", made.cases);
  if (made.batches.length) await svc.from("recon_batches").delete().in("id", made.batches);
});

describe("RLS: close rights", () => {
  it("a finance_exec cannot close a case", async () => {
    const { client } = await signInAs("finance_exec");
    await client.from("unrecon_cases").update({ status: "closed" }).eq("id", execCase);
    const { data } = await svc.from("unrecon_cases").select("status").eq("id", execCase).single();
    expect(data?.status).toBe("outlet_responded"); // blocked by WITH CHECK
  });

  it("a finance_manager can close a case", async () => {
    const { client } = await signInAs("finance_manager");
    const { data, error } = await client
      .from("unrecon_cases")
      .update({ status: "closed" })
      .eq("id", mgrCase)
      .select("id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const { data: after } = await svc.from("unrecon_cases").select("status").eq("id", mgrCase).single();
    expect(after?.status).toBe("closed");
  });
});
