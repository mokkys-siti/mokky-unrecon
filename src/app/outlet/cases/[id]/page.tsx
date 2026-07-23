import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnswerForm, type ReasonOption } from "./answer-form";

export const dynamic = "force-dynamic";

type Line = {
  side: "POS" | "PG";
  external_ref: string | null;
  tender_code: string | null;
  amount: number | null;
  business_date: string | null;
};

export default async function OutletCaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: kase } = await supabase
    .from("unrecon_cases")
    .select(
      "id, gateway_code, business_date, case_type, classification, pos_amount, pg_amount, variance, status, outlets(code), case_lines(side, external_ref, tender_code, amount, business_date)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!kase) notFound();

  const outlet = Array.isArray(kase.outlets) ? kase.outlets[0] : kase.outlets;
  const lines = (kase.case_lines ?? []) as Line[];

  // Reason list filtered by applies_to_outlets / applies_to_gateways.
  const { data: allReasons } = await supabase
    .from("reason_codes")
    .select("id, code, label, group_name, requires_evidence, applies_to_outlets, applies_to_gateways")
    .eq("is_active", true)
    .order("sort_order");

  const reasons: ReasonOption[] = (allReasons ?? [])
    .filter(
      (r) =>
        (!r.applies_to_outlets || (outlet && r.applies_to_outlets.includes(outlet.code))) &&
        (!r.applies_to_gateways || r.applies_to_gateways.includes(kase.gateway_code)),
    )
    .map((r) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      group: r.group_name,
      requiresEvidence: r.requires_evidence,
    }));

  const isConfirm = kase.classification === "OUTLET_ERROR";
  const suggestedReasonId =
    reasons.find((r) => r.code === "OE_WRONG_TENDER")?.id ?? null;

  const money = (n: number | null) => (n == null ? "—" : `RM ${n.toFixed(2)}`);

  return (
    <div>
      <a href="/outlet" className="text-sm text-gray-500">
        ← Back
      </a>

      <div className="mt-3 rounded-2xl border border-gray-200 bg-brand-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {kase.gateway_code} · {kase.business_date ?? "—"}
          </span>
          <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-medium text-brand-orange">
            {isConfirm ? "Recording error" : "Needs investigation"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-[11px] text-gray-400">POS (Zeoniq)</div>
            <div className="text-lg font-bold text-gray-900">{money(kase.pos_amount)}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-[11px] text-gray-400">Gateway</div>
            <div className="text-lg font-bold text-gray-900">{money(kase.pg_amount)}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium uppercase text-gray-400">Lines</div>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-mono text-xs text-gray-500">
                  {l.side} · {l.external_ref ?? "—"}
                </span>
                <span className="text-gray-700">{money(l.amount)}</span>
              </div>
            ))}
            {lines.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">No line detail.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <AnswerForm
          caseId={kase.id}
          reasons={reasons}
          isConfirm={isConfirm}
          suggestedReasonId={suggestedReasonId}
        />
      </div>
    </div>
  );
}
