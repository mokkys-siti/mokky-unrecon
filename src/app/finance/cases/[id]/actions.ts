"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole, type AppRole } from "@/lib/auth/roles";

export type ReviewState = { error: string | null };

function canReview(role: AppRole | null | undefined): boolean {
  return role === "admin" || (!!role && isFinanceRole(role));
}
function canClose(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "finance_manager";
}

export async function acceptCase(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await getSession();
  if (!session) return { error: "Signed out." };
  if (!canClose(session.appRole)) {
    return { error: "Only a finance manager can close cases." };
  }
  const caseId = String(formData.get("caseId") ?? "");
  const dispositionId = String(formData.get("dispositionId") ?? "") || null;
  if (!caseId) return { error: "Missing case." };
  if (!dispositionId) return { error: "Choose a disposition." };

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("unrecon_cases")
    .update({
      status: "closed",
      disposition_code_id: dispositionId,
      closed_at: nowIso,
      closed_by: session.userId,
      updated_at: nowIso,
    })
    .eq("id", caseId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Not closed (permission or missing)." };

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "closed",
    actor_id: session.userId,
    payload: { disposition_code_id: dispositionId },
  });

  revalidatePath("/finance/cases");
  redirect("/finance/cases");
}

export async function rejectCase(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await getSession();
  if (!session || !canReview(session.appRole)) return { error: "Not authorized." };
  const caseId = String(formData.get("caseId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!caseId) return { error: "Missing case." };
  if (!note) return { error: "Add a note telling the outlet what to fix." };

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("unrecon_cases")
    .update({ status: "awaiting_outlet", updated_at: nowIso })
    .eq("id", caseId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Not updated." };

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "rejected",
    actor_id: session.userId,
    payload: { note },
  });

  revalidatePath("/finance/cases");
  redirect("/finance/cases");
}
