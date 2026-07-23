"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export type AnswerState = { error: string | null };

function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
}

export async function submitResponse(
  _prev: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const session = await getSession();
  if (!session) return { error: "You are signed out. Please sign in again." };

  const caseId = String(formData.get("caseId") ?? "");
  const reasonId = String(formData.get("reasonId") ?? "");
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const evidence = formData.get("evidence");
  if (!caseId) return { error: "Missing case." };
  if (!reasonId) return { error: "Please choose a reason." };

  const supabase = await createClient();

  const { data: reason } = await supabase
    .from("reason_codes")
    .select("requires_evidence")
    .eq("id", reasonId)
    .single();
  const { data: kase } = await supabase
    .from("unrecon_cases")
    .select("id, outlet_id")
    .eq("id", caseId)
    .maybeSingle();
  if (!kase) return { error: "This case can no longer be answered." };

  const hasFile = evidence instanceof File && evidence.size > 0;
  if (reason?.requires_evidence && !hasFile) {
    return { error: "This reason needs a photo as evidence. Please add one." };
  }

  // Upload evidence to the private, path-scoped bucket, then record it.
  if (hasFile) {
    const file = evidence as File;
    const path = `${kase.outlet_id}/${caseId}/${Date.now()}_${sanitize(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from("case-evidence")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Evidence upload failed: ${upErr.message}` };

    const { error: attErr } = await supabase.from("case_attachments").insert({
      case_id: caseId,
      storage_path: path,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: session.userId,
    });
    if (attErr) return { error: `Could not save evidence: ${attErr.message}` };
  }

  // The response insert transitions the case (trigger) and logs an event.
  const { error: respErr } = await supabase.from("case_responses").insert({
    case_id: caseId,
    user_id: session.userId,
    reason_code_id: reasonId,
    remarks,
  });
  if (respErr) return { error: `Could not submit: ${respErr.message}` };

  revalidatePath("/outlet");
  redirect("/outlet");
}
