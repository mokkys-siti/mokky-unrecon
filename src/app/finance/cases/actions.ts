"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export type BulkState = { error: string | null; closed: number };

export async function bulkCloseCases(
  _prev: BulkState,
  formData: FormData,
): Promise<BulkState> {
  const session = await getSession();
  const canClose = session && (session.appRole === "admin" || session.appRole === "finance_manager");
  if (!session || !canClose) {
    return { error: "Only a finance manager can bulk-close.", closed: 0 };
  }
  const ids = formData.getAll("caseIds").map(String).filter(Boolean);
  if (ids.length === 0) return { error: "Select at least one case.", closed: 0 };

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("unrecon_cases")
    .update({ status: "closed", closed_at: nowIso, closed_by: session.userId, updated_at: nowIso })
    .in("id", ids)
    .in("status", ["open", "awaiting_outlet", "outlet_responded", "under_review"])
    .select("id");
  if (error) return { error: error.message, closed: 0 };

  const events = (data ?? []).map((c) => ({
    case_id: c.id,
    event_type: "closed",
    actor_id: session.userId,
    payload: { bulk: true },
  }));
  if (events.length) await supabase.from("case_events").insert(events);

  revalidatePath("/finance/cases");
  return { error: null, closed: data?.length ?? 0 };
}
