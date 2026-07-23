"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSIFICATIONS,
  FAULT_OWNERS,
  type Classification,
  type FaultOwner,
} from "@/lib/db/types";

export type RuleFormState = { error: string | null };

export async function updateClassificationRule(
  _prev: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 0);
  const condition = String(formData.get("condition") ?? "").trim() || null;
  const classification = String(formData.get("classification") ?? "");
  const faultOwner = String(formData.get("fault_owner") ?? "");
  const outletVisible = formData.get("outlet_visible") === "on";
  const autoClose = formData.get("auto_close") === "on";
  const isActive = formData.get("is_active") === "on";

  if (!id) return { error: "Missing rule id." };
  if (!name) return { error: "Name is required." };
  if (!Number.isInteger(priority)) {
    return { error: "Priority must be a whole number." };
  }
  if (!CLASSIFICATIONS.includes(classification as Classification)) {
    return { error: "Invalid classification." };
  }
  if (!FAULT_OWNERS.includes(faultOwner as FaultOwner)) {
    return { error: "Invalid fault owner." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classification_rules")
    .update({
      name,
      priority,
      condition,
      classification,
      fault_owner: faultOwner,
      outlet_visible: outletVisible,
      auto_close: autoClose,
      is_active: isActive,
    })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Not saved — you may not have permission, or it was removed." };
  }

  revalidatePath("/admin/classification-rules");
  redirect("/admin/classification-rules");
}
