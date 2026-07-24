import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkBook } from "xlsx";
import {
  parseWorkbook,
  type GatewayLayout,
  type ReconLayout,
} from "./parse";
import { classifyCase, type ClassificationRule } from "./classify";
import { buildCaseKey } from "./caseKey";
import { gatewayFromTender } from "./tenders";

type DB = SupabaseClient;

export async function loadLayoutConfig(
  supabase: DB,
  version = "combined_v1",
): Promise<{ layout: ReconLayout; gateways: GatewayLayout[] }> {
  const { data: l, error } = await supabase
    .from("recon_layouts")
    .select("*")
    .eq("version", version)
    .single();
  if (error || !l) throw new Error(`Layout config '${version}' not found`);

  const { data: g } = await supabase
    .from("recon_gateway_columns")
    .select("*")
    .eq("layout_version", version)
    .order("sort_order");

  return {
    layout: {
      resultsSheet: l.results_sheet,
      interreconSheet: l.interrecon_sheet,
      resultsDataRow: l.results_data_row,
      interreconDataRow: l.interrecon_data_row,
      checksumBillNoCell: l.checksum_bill_no_cell,
      checksumNoBillCell: l.checksum_no_bill_cell,
    },
    gateways: (g ?? []).map((x) => ({
      gatewayCode: x.gateway_code,
      sectionTitle: x.section_title,
      pos: x.pos_columns,
      pg: x.pg_columns,
      pgAmountBasis: x.pg_amount_basis,
    })),
  };
}

export type StageResult = {
  batchId: string;
  outletCode: string;
  created: number;
  agedUp: number;
  autoClosed: number;
  feedWarnings: { gatewayCode: string; previous: number; now: number }[];
  summary: Record<string, unknown>;
};

export async function stageBatch(
  supabase: DB,
  args: {
    workbook: WorkBook;
    fileName: string;
    fileHash: string;
    periodLabel: string | null;
    uploadedBy: string | null;
  },
): Promise<StageResult> {
  const { layout, gateways } = await loadLayoutConfig(supabase);
  const parsed = parseWorkbook(args.workbook, layout, gateways);

  // Resolve outlet from the name inside the file (Results Outlet column).
  if (!parsed.outletName) throw new Error("Could not read the outlet name from the file");
  const { data: outlet } = await supabase
    .from("outlets")
    .select("id, code, zeoniq_name")
    .eq("zeoniq_name", parsed.outletName)
    .maybeSingle();
  if (!outlet) throw new Error(`No outlet matches '${parsed.outletName}'`);

  // Assign a gateway to Interrecon variance cases (they have none).
  for (const c of parsed.cases) {
    if (!c.gatewayCode) {
      c.gatewayCode = gatewayFromTender(c.adjTender) ?? gatewayFromTender(c.tender) ?? "UNKNOWN";
    }
  }

  // Multiple unpublished batches per outlet are allowed (e.g. two periods loaded
  // together). Publish is order-safe: it only clears cases from OLDER PUBLISHED
  // batches, never from another still-in-review batch (see publishBatch).

  // Create the batch (unique on outlet+file_hash prevents the same file twice).
  const { data: batch, error: batchErr } = await supabase
    .from("recon_batches")
    .insert({
      outlet_id: outlet.id,
      period_label: args.periodLabel,
      source_filename: args.fileName,
      file_hash: args.fileHash,
      uploaded_by: args.uploadedBy,
      status: "review",
    })
    .select("id")
    .single();
  if (batchErr) {
    if (batchErr.code === "23505") throw new Error("This file has already been uploaded for this outlet.");
    throw batchErr;
  }
  const batchId = batch.id as string;

  // Classification config.
  const { data: ruleRows } = await supabase
    .from("classification_rules")
    .select("rule_key, priority, classification, fault_owner, outlet_visible, auto_close, is_active")
    .eq("is_active", true);
  const rules: ClassificationRule[] = (ruleRows ?? []).map((r) => ({
    ruleKey: r.rule_key,
    priority: r.priority,
    classification: r.classification,
    faultOwner: r.fault_owner,
    outletVisible: r.outlet_visible,
    autoClose: r.auto_close,
  }));
  const { data: gwRows } = await supabase
    .from("payment_gateways")
    .select("code, tolerance_min, tolerance_max");
  const tolerance = new Map(
    (gwRows ?? []).map((g) => [g.code, { min: Number(g.tolerance_min), max: Number(g.tolerance_max) }]),
  );

  // Existing LIVE cases for this outlet keyed by case_key (idempotent re-import).
  // Soft-deleted cases are ignored on purpose: after deleting a wrongly-uploaded
  // batch, re-importing the corrected file must create fresh cases.
  const keyed = parsed.cases.map((c) => ({ c, key: buildCaseKey(outlet.code, c) }));
  const { data: existingRows } = await supabase
    .from("unrecon_cases")
    .select("id, case_key, status")
    .eq("outlet_id", outlet.id)
    .is("deleted_at", null)
    .in("case_key", keyed.map((k) => k.key));
  const existing = new Map((existingRows ?? []).map((r) => [r.case_key, r]));

  let created = 0;
  // Existing unresolved cases that reappeared. We do NOT repoint their batch_id
  // now — that happens at publish, so they stay visible on their last published
  // batch while this one is in review, and can't be stranded by a later stage.
  const seenExistingIds: string[] = [];
  const RESOLVED = new Set(["closed", "auto_closed"]);

  for (const { c, key } of keyed) {
    const prior = existing.get(key);
    if (prior) {
      if (!RESOLVED.has(prior.status)) seenExistingIds.push(prior.id);
      continue;
    }

    const tol = tolerance.get(c.gatewayCode) ?? { min: -0.05, max: 0.05 };
    const cls = classifyCase(
      {
        caseType: c.caseType,
        tender: c.tender,
        adjTender: c.adjTender,
        variance: (c.pgAmount ?? 0) - (c.posAmount ?? 0),
        toleranceMin: tol.min,
        toleranceMax: tol.max,
      },
      rules,
    );

    const nowIso = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("unrecon_cases")
      .insert({
        case_key: key,
        batch_id: batchId,
        first_seen_batch_id: batchId,
        outlet_id: outlet.id,
        gateway_code: c.gatewayCode,
        business_date: c.businessDate,
        case_type: c.caseType,
        classification: cls.classification,
        fault_owner: cls.faultOwner,
        outlet_visible: cls.autoClose ? false : cls.outletVisible,
        pos_amount: c.posAmount,
        pg_amount: c.pgAmount,
        status: cls.autoClose ? "auto_closed" : "open",
        or_sequence: c.orSequence,
        first_seen_at: nowIso,
        closed_at: cls.autoClose ? nowIso : null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    created++;

    const lineRows = c.lines.map((ln) => ({
      case_id: inserted.id,
      side: ln.side,
      gateway_code: c.gatewayCode,
      txn_datetime: ln.txnDatetime,
      business_date: ln.businessDate,
      external_ref: ln.externalRef,
      tender_code: ln.tenderCode,
      amount: ln.amount,
      raw: ln.raw,
    }));
    if (lineRows.length) {
      const { error: lineErr } = await supabase.from("case_lines").insert(lineRows);
      if (lineErr) throw lineErr;
    }
  }

  // Per-gateway stats.
  const statRows = parsed.stats.map((s) => ({
    batch_id: batchId,
    gateway_code: s.gatewayCode,
    rows_read: s.rowsRead,
    rows_junk: s.rowsJunk,
    rows_kept: s.rowsKept,
    total_amount: s.totalAmount,
    feed_status: s.feedStatus,
  }));
  if (statRows.length) await supabase.from("batch_gateway_stats").insert(statRows);

  // Feed-completeness gate: a gateway that previously had rows now reading zero.
  const feedWarnings = await checkFeedCompleteness(supabase, outlet.id, batchId, parsed.stats);

  const agedUp = seenExistingIds.length;
  const summary = {
    outletName: parsed.outletName,
    checksum: parsed.checksum,
    junk: parsed.junk,
    counts: {
      byType: parsed.cases.reduce<Record<string, number>>((a, c) => {
        a[c.caseType] = (a[c.caseType] ?? 0) + 1;
        return a;
      }, {}),
      created,
      agedUp,
    },
    // Recorded so publish can age these up (repoint to this batch) at publish time.
    seenExistingIds,
    feedWarnings,
  };
  await supabase.from("recon_batches").update({ parse_summary: summary }).eq("id", batchId);

  return { batchId, outletCode: outlet.code, created, agedUp, autoClosed: 0, feedWarnings, summary };
}

async function checkFeedCompleteness(
  supabase: DB,
  outletId: string,
  batchId: string,
  stats: { gatewayCode: string; rowsRead: number }[],
): Promise<{ gatewayCode: string; previous: number; now: number }[]> {
  // Baseline against the most recent PUBLISHED, non-deleted batch — a failed or
  // retracted batch must not become the "previous had data" reference.
  const { data: prevBatch } = await supabase
    .from("recon_batches")
    .select("id")
    .eq("outlet_id", outletId)
    .eq("status", "published")
    .is("deleted_at", null)
    .neq("id", batchId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prevBatch) return [];

  const { data: prevStats } = await supabase
    .from("batch_gateway_stats")
    .select("gateway_code, rows_read")
    .eq("batch_id", prevBatch.id);
  const prev = new Map((prevStats ?? []).map((s) => [s.gateway_code, s.rows_read]));

  const warnings: { gatewayCode: string; previous: number; now: number }[] = [];
  for (const s of stats) {
    const before = prev.get(s.gatewayCode) ?? 0;
    if (before > 0 && s.rowsRead === 0) {
      warnings.push({ gatewayCode: s.gatewayCode, previous: before, now: 0 });
    }
  }
  return warnings;
}

/** Publish a reviewed batch. Order matters:
 *  1. Age up the cases this import re-saw (repoint to this batch) so they stay
 *     visible and are NOT swept by step 2.
 *  2. Auto-close the outlet's remaining open cases (absent from this import) as
 *     cleared in a later recon.
 *  3. Mark the batch published (cases become outlet-visible via RLS).
 */
export async function publishBatch(
  supabase: DB,
  batchId: string,
  closedBy: string | null = null,
): Promise<{ autoClosed: number; agedUp: number }> {
  const { data: batch, error } = await supabase
    .from("recon_batches")
    .select("id, outlet_id, status, parse_summary, uploaded_at")
    .eq("id", batchId)
    .single();
  if (error || !batch) throw new Error("Batch not found");

  const nowIso = new Date().toISOString();
  const summary = (batch.parse_summary ?? {}) as { seenExistingIds?: string[] };
  const seen = summary.seenExistingIds ?? [];

  // 1. Age up re-seen cases FIRST (repoints them to this batch, so step 2 skips them).
  if (seen.length) {
    await supabase
      .from("unrecon_cases")
      .update({ batch_id: batchId, updated_at: nowIso })
      .in("id", seen)
      .in("status", ["open", "awaiting_outlet", "outlet_responded", "under_review"]);
  }

  // 2. Auto-close prior state absent from this import — but ONLY cases belonging
  //    to OLDER, already-published batches. This never touches another batch
  //    that is still in review, and never a newer batch, so publish order is safe.
  const { data: olderPublished } = await supabase
    .from("recon_batches")
    .select("id")
    .eq("outlet_id", batch.outlet_id)
    .eq("status", "published")
    .is("deleted_at", null)
    .lt("uploaded_at", batch.uploaded_at);
  const olderIds = (olderPublished ?? []).map((b) => b.id);

  let autoClosed = 0;
  if (olderIds.length) {
    const { data: closed } = await supabase
      .from("unrecon_cases")
      .update({ status: "auto_closed", closed_at: nowIso, closed_by: closedBy, updated_at: nowIso })
      .in("batch_id", olderIds)
      .in("status", ["open", "awaiting_outlet", "outlet_responded", "under_review"])
      .is("deleted_at", null)
      .select("id");
    autoClosed = closed?.length ?? 0;
  }

  // 3. Publish.
  await supabase.from("recon_batches").update({ status: "published" }).eq("id", batchId);
  return { autoClosed, agedUp: seen.length };
}
