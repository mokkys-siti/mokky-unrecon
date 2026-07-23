import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublishForm } from "./publish-form";

export const dynamic = "force-dynamic";

type Summary = {
  checksum?: {
    fileBillNoPayment: number | null;
    filePaymentNoBill: number | null;
    parsedBillNoPayment: number;
    parsedPaymentNoBill: number;
    reconciles: boolean;
  };
  junk?: { formulaErrors: number; shopeeSpill: number; zeroAmount: number };
  feedWarnings?: { gatewayCode: string; previous: number; now: number }[];
  override?: { reason: string; at: string };
};

export default async function BatchReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("recon_batches")
    .select("id, period_label, source_filename, status, uploaded_at, parse_summary, outlets(code, zeoniq_name)")
    .eq("id", id)
    .maybeSingle();
  if (!batch) notFound();

  const { data: stats } = await supabase
    .from("batch_gateway_stats")
    .select("*")
    .eq("batch_id", id)
    .order("gateway_code");

  const { data: cases } = await supabase
    .from("unrecon_cases")
    .select("case_type, classification, outlet_visible, status")
    .eq("batch_id", id);

  const summary = (batch.parse_summary ?? {}) as Summary;
  const outlet = Array.isArray(batch.outlets) ? batch.outlets[0] : batch.outlets;
  const warnings = summary.feedWarnings ?? [];
  const caseRows = cases ?? [];
  const visible = caseRows.filter((c) => c.outlet_visible).length;
  const autoClosed = caseRows.filter((c) => c.status === "auto_closed").length;

  const byType = caseRows.reduce<Record<string, number>>((a, c) => {
    a[c.case_type] = (a[c.case_type] ?? 0) + 1;
    return a;
  }, {});

  return (
    <div>
      <Link href="/finance/batches" className="text-sm text-gray-500 hover:text-brand-orange">
        ← Batches
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {outlet?.code} · {batch.period_label ?? "—"}
        </h1>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          {batch.status}
        </span>
      </div>
      <p className="mt-1 max-w-xl truncate text-xs text-gray-500">{batch.source_filename}</p>

      {/* Feed-completeness gate */}
      {warnings.length > 0 && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-800">Feed warnings — publication blocked</h2>
          <p className="mt-1 text-sm text-red-700">
            These gateways had data last time but read zero rows now. A broken feed looks
            perfectly reconciled but isn&apos;t. Investigate, or override with a written reason.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {warnings.map((w) => (
              <li key={w.gatewayCode}>
                <span className="font-medium">{w.gatewayCode}</span>: {w.previous} rows previously → 0 now
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary tiles */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Tile label="Cases created" value={caseRows.length} />
        <Tile label="Visible to outlets" value={visible} />
        <Tile label="Auto-closed (rounding)" value={autoClosed} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Tile label="Bill, no payment" value={byType.BILL_NO_PAYMENT ?? 0} />
        <Tile label="Payment, no bill" value={byType.PAYMENT_NO_BILL ?? 0} />
        <Tile label="Variance (interrecon)" value={byType.VARIANCE ?? 0} />
      </div>

      {/* Checksum + junk */}
      {summary.checksum && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-brand-white p-4 text-sm">
          <h2 className="font-semibold text-gray-900">Checksum (advisory)</h2>
          <p className="mt-1 text-gray-600">
            File: {summary.checksum.fileBillNoPayment ?? "—"} bills-no-payment,{" "}
            {summary.checksum.filePaymentNoBill ?? "—"} payments-no-bill · Parsed rows:{" "}
            {summary.checksum.parsedBillNoPayment} / {summary.checksum.parsedPaymentNoBill}
            {summary.checksum.reconciles ? (
              <span className="ml-2 font-medium text-green-700">reconciles</span>
            ) : (
              <span className="ml-2 font-medium text-amber-700">differs — worth a look</span>
            )}
          </p>
          {summary.junk && (
            <p className="mt-1 text-gray-500">
              Junk dropped: {summary.junk.formulaErrors} formula errors, {summary.junk.shopeeSpill} Shopee spill,{" "}
              {summary.junk.zeroAmount} zero-amount
            </p>
          )}
        </div>
      )}

      {/* Per-gateway stats */}
      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Gateway</th>
              <th className="px-4 py-2 font-medium">Read</th>
              <th className="px-4 py-2 font-medium">Junk</th>
              <th className="px-4 py-2 font-medium">Kept</th>
              <th className="px-4 py-2 font-medium">Total (RM)</th>
              <th className="px-4 py-2 font-medium">Feed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(stats ?? []).map((s) => (
              <tr key={s.gateway_code}>
                <td className="px-4 py-2 font-medium text-gray-900">{s.gateway_code}</td>
                <td className="px-4 py-2 text-gray-700">{s.rows_read}</td>
                <td className="px-4 py-2 text-gray-500">{s.rows_junk}</td>
                <td className="px-4 py-2 text-gray-700">{s.rows_kept}</td>
                <td className="px-4 py-2 text-gray-700">{Number(s.total_amount).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      s.feed_status === "ok"
                        ? "text-green-700"
                        : s.feed_status === "empty"
                          ? "text-gray-500"
                          : "text-red-700"
                    }
                  >
                    {s.feed_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Publish */}
      {batch.status === "review" ? (
        <div className="mt-6">
          <PublishForm batchId={id} hasWarnings={warnings.length > 0} />
        </div>
      ) : batch.status === "published" ? (
        <p className="mt-6 rounded-lg bg-brand-green/10 px-4 py-3 text-sm text-green-800">
          Published — cases are visible to the outlet.
          {summary.override ? ` Overridden: "${summary.override.reason}".` : ""}
        </p>
      ) : null}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-brand-white p-4">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}
