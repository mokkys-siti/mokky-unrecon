import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { ReviewForms } from "./review-forms";

export const dynamic = "force-dynamic";

function one<T extends object>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
const money = (n: number | null) => (n == null ? "—" : `RM ${n.toFixed(2)}`);

export default async function FinanceCaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getSession();

  const { data: kase } = await supabase
    .from("unrecon_cases")
    .select(
      "id, gateway_code, business_date, case_type, classification, fault_owner, status, pos_amount, pg_amount, variance, outlet_visible, outlets(code), reason_codes(label), disposition_codes(label), case_lines(side, external_ref, tender_code, amount)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!kase) notFound();

  const [{ data: responses }, { data: attachments }, { data: events }, { data: dispositions }] =
    await Promise.all([
      supabase
        .from("case_responses")
        .select("remarks, submitted_at, reason_codes(label)")
        .eq("case_id", id)
        .order("submitted_at", { ascending: false }),
      supabase.from("case_attachments").select("storage_path, filename, mime_type").eq("case_id", id),
      supabase
        .from("case_events")
        .select("event_type, payload, created_at")
        .eq("case_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("disposition_codes").select("id, label").eq("is_active", true).order("sort_order"),
    ]);

  // Signed URLs for evidence (private bucket).
  const evidence: { url: string; filename: string | null }[] = [];
  for (const a of attachments ?? []) {
    const { data: signed } = await supabase.storage
      .from("case-evidence")
      .createSignedUrl(a.storage_path, 3600);
    if (signed?.signedUrl) evidence.push({ url: signed.signedUrl, filename: a.filename });
  }

  const outlet = one(kase.outlets);
  const reason = one(kase.reason_codes);
  const disposition = one(kase.disposition_codes);
  const latestResponse = (responses ?? [])[0];
  const answerable = kase.status === "outlet_responded" || kase.status === "under_review";
  const canClose = session?.appRole === "admin" || session?.appRole === "finance_manager";

  return (
    <div>
      <Link href="/finance/cases" className="text-sm text-gray-500 hover:text-brand-orange">
        ← Cases
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {outlet?.code} · {kase.gateway_code}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {kase.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {kase.case_type} · {kase.classification} · {kase.business_date ?? "—"}
        {!kase.outlet_visible && " · hidden from outlet"}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Tile label="POS" value={money(kase.pos_amount)} />
        <Tile label="PG" value={money(kase.pg_amount)} />
        <Tile label="Variance" value={money(kase.variance)} />
      </div>

      <Section title="Lines">
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {(kase.case_lines ?? []).map((l, i) => (
            <div key={i} className="flex justify-between px-3 py-2 text-sm">
              <span className="font-mono text-xs text-gray-500">
                {l.side} · {l.external_ref ?? "—"} · {l.tender_code ?? ""}
              </span>
              <span className="text-gray-700">{money(l.amount)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Outlet response">
        {latestResponse ? (
          <div className="rounded-lg border border-gray-100 p-3 text-sm">
            <div className="font-medium text-gray-900">{one(latestResponse.reason_codes)?.label ?? reason?.label}</div>
            {latestResponse.remarks && <p className="mt-1 text-gray-600">{latestResponse.remarks}</p>}
            <p className="mt-1 text-xs text-gray-400">
              {new Date(latestResponse.submitted_at).toISOString().slice(0, 16).replace("T", " ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No response yet.</p>
        )}
      </Section>

      {evidence.length > 0 && (
        <Section title="Evidence">
          <div className="flex flex-wrap gap-3">
            {evidence.map((e, i) => (
              <a key={i} href={e.url} target="_blank" rel="noreferrer" className="text-sm text-brand-orange underline">
                {e.filename ?? `Attachment ${i + 1}`}
              </a>
            ))}
          </div>
        </Section>
      )}

      {kase.status === "closed" && disposition && (
        <Section title="Disposition">
          <p className="text-sm text-gray-700">{disposition.label}</p>
        </Section>
      )}

      {answerable && (
        <Section title="Review">
          <ReviewForms caseId={kase.id} dispositions={dispositions ?? []} canClose={!!canClose} />
        </Section>
      )}

      <Section title="History">
        <ul className="space-y-1 text-xs text-gray-500">
          {(events ?? []).map((e, i) => (
            <li key={i}>
              <span className="font-medium text-gray-700">{e.event_type}</span> ·{" "}
              {new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ")}
            </li>
          ))}
          {(events ?? []).length === 0 && <li>No events.</li>}
        </ul>
      </Section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-brand-white p-3">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </section>
  );
}
