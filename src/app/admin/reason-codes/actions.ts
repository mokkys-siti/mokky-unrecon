"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ReasonCodeFormState = { error: string | null };

function parseCodeList(raw: string): string[] | null {
  const list = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

export async function updateReasonCode(
  _prev: ReasonCodeFormState,
  formData: FormData,
): Promise<ReasonCodeFormState> {
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const groupName = String(formData.get("group_name") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const requiresEvidence = formData.get("requires_evidence") === "on";
  const isActive = formData.get("is_active") === "on";
  const appliesToOutlets = parseCodeList(
    String(formData.get("applies_to_outlets") ?? ""),
  );

  if (!id) return { error: "Missing reason code id." };
  if (!label) return { error: "Label is required." };
  if (!Number.isInteger(sortOrder)) {
    return { error: "Sort order must be a whole number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reason_codes")
    .update({
      label,
      group_name: groupName,
      sort_order: sortOrder,
      requires_evidence: requiresEvidence,
      is_active: isActive,
      applies_to_outlets: appliesToOutlets,
    })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Not saved — you may not have permission, or it was removed." };
  }

  revalidatePath("/admin/reason-codes");
  redirect("/admin/reason-codes");
}
