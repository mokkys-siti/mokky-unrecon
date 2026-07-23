import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CaseLine = { side: "POS" | "PG"; external_ref: string | null };
type CaseRow = {
  id: string;
  gateway_code: string;
  business_date: string | null;
  case_type: string;
  classification: string | null;
  pos_amount: number | null;
  pg_amount: number | null;
  variance: number | null;
  case_lines: CaseLine[];
};

function identifier(c: CaseRow): string {
  const pos = c.case_lines.find((l) => l.side === "POS")?.external_ref;
  const pg = c.case_lines.find((l) => l.side === "PG")?.external_ref;
  return pos ?? pg ?? "—";
}

function money(n: number | null): string {
  return n == null ? "—" : `RM ${n.toFixed(2)}`;
}

function varianceNote(c: CaseRow): string {
  const v = c.variance ?? 0;
  if (v === 0) return "";
  return v < 0 ? `Short by RM ${Math.abs(v).toFixed(2)}` : `Over by RM ${v.toFixed(2)}`;
}

function Card({ c, cta }: { c: CaseRow; cta: string }) {
  return (
    <Link
      href={`/outlet/cases/${c.id}`}
      className="block rounded-2xl border border-gray-200 bg-brand-white p-4 shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">{identifier(c)}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {c.gateway_code}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-500">{c.business_date ?? "—"}</div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <div>
          <div className="text-[11px] text-gray-400">POS</div>
          <div className="font-medium text-gray-900">{money(c.pos_amount)}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400">PG</div>
          <div className="font-medium text-gray-900">{money(c.pg_amount)}</div>
        </div>
        <div className="ml-auto text-right text-xs font-medium text-brand-orange">
          {varianceNote(c)}
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-brand-orange/10 px-3 py-1.5 text-center text-sm font-semibold text-brand-orange">
        {cta}
      </div>
    </Link>
  );
}

export default async function OutletQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("unrecon_cases")
    .select(
      "id, gateway_code, business_date, case_type, classification, pos_amount, pg_amount, variance, case_lines(side, external_ref)",
    )
    .in("status", ["open", "awaiting_outlet"])
    .order("business_date", { ascending: true });

  const cases = (data ?? []) as CaseRow[];
  const confirm = cases.filter((c) => c.classification === "OUTLET_ERROR");
  const investigate = cases.filter((c) => c.classification !== "OUTLET_ERROR");

  const { count: submitted } = await supabase
    .from("unrecon_cases")
    .select("*", { count: "exact", head: true })
    .eq("status", "outlet_responded");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Your cases</h1>
        <p className="mt-0.5 text-sm text-gray-600">
          {cases.length} to answer{submitted ? ` · ${submitted} submitted` : ""}
        </p>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
          Confirm
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {confirm.length}
          </span>
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Recording errors with a known cause — tap to acknowledge.
        </p>
        {confirm.length === 0 ? (
          <p className="rounded-xl bg-brand-white/60 px-4 py-6 text-center text-sm text-gray-400">
            Nothing to confirm.
          </p>
        ) : (
          <div className="space-y-3">
            {confirm.map((c) => (
              <Card key={c.id} c={c} cta="Acknowledge →" />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
          Investigate
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {investigate.length}
          </span>
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Cause unknown — pick a reason and add any evidence.
        </p>
        {investigate.length === 0 ? (
          <p className="rounded-xl bg-brand-white/60 px-4 py-6 text-center text-sm text-gray-400">
            Nothing to investigate.
          </p>
        ) : (
          <div className="space-y-3">
            {investigate.map((c) => (
              <Card key={c.id} c={c} cta="Answer →" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
