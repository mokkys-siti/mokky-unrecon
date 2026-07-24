"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole } from "@/lib/auth/roles";
import { publishBatch } from "@/lib/recon/ingest";

export type PublishState = { error: string | null; published: boolean };

/**
 * Soft-delete a wrongly-uploaded batch and its cases (deleted_at) — honours the
 * no-hard-delete rule, hides it everywhere, and frees the same file to be
 * re-uploaded (the unique index and the one-unpublished-batch guard both ignore
 * deleted rows). Allowed for non-published batches (a wrong report is caught at
 * review); publishing is the point of no easy return.
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
    .select("id, status, deleted_at")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch || batch.deleted_at) return;
  if (batch.status === "published") return; // published batches are not deletable here

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
  redirect("/finance/batches");
}

export async function publishBatchAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const session = await getSession();
  const allowed =
    session &&
    (session.appRole === "admin" ||
      (session.appRole && isFinanceRole(session.appRole)));
  if (!session || !allowed) return { error: "Not authorized.", published: false };

  const batchId = String(formData.get("batchId") ?? "");
  const override = String(formData.get("override") ?? "").trim();
  const supabase = await createClient();

  const { data: batch, error } = await supabase
    .from("recon_batches")
    .select("id, status, parse_summary")
    .eq("id", batchId)
    .single();
  if (error || !batch) return { error: "Batch not found.", published: false };
  if (batch.status !== "review") {
    return { error: `Batch is '${batch.status}', not in review.`, published: false };
  }

  const summary = (batch.parse_summary ?? {}) as Record<string, unknown>;
  const warnings = (summary.feedWarnings as unknown[]) ?? [];
  if (warnings.length > 0 && !override) {
    return {
      error: "This batch has feed warnings. Enter a written reason to override and publish.",
      published: false,
    };
  }

  // Log the override on the batch (append-only spirit; case_events arrive in Phase 3).
  if (warnings.length > 0) {
    await supabase
      .from("recon_batches")
      .update({
        parse_summary: {
          ...summary,
          override: { reason: override, by: session.userId, at: new Date().toISOString() },
        },
      })
      .eq("id", batchId);
  }

  await publishBatch(supabase, batchId, session.userId);
  revalidatePath(`/finance/batches/${batchId}`);
  revalidatePath("/finance/batches");
  return { error: null, published: true };
}
