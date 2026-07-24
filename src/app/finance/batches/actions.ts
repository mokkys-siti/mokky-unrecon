"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole } from "@/lib/auth/roles";

/**
 * Soft-delete a batch and its cases (deleted_at) — honours the no-hard-delete
 * rule, hides it everywhere, and frees the same file for re-upload (the unique
 * index, the one-unpublished-batch guard, and case_key uniqueness all ignore
 * deleted rows). Allowed for any status; the UI warns loudly when published,
 * because withdrawing published cases discards answers outlets already gave.
 */
export async function deleteBatchAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const allowed =
    session &&
    (session.appRole === "admin" ||
      (session.appRole && isFinanceRole(session.appRole)));
  const batchId = String(formData.get("batchId") ?? "");
  if (!session || !allowed || !batchId) return;

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("recon_batches")
    .select("id, deleted_at")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch || batch.deleted_at) return;

  const nowIso = new Date().toISOString();
  await supabase
    .from("unrecon_cases")
    .update({ deleted_at: nowIso, updated_at: nowIso })
    .eq("batch_id", batchId)
    .is("deleted_at", null);
  await supabase
    .from("recon_batches")
    .update({ deleted_at: nowIso })
    .eq("id", batchId);

  revalidatePath("/finance/batches");
  revalidatePath("/finance/dashboard");
  redirect("/finance/batches");
}
