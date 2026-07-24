import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  outlet_id: string;
  code: string;
  zeoniq_name: string | null;
  visible_total: number;
  awaiting: number;
  responded: number;
  closed: number;
  auto_closed: number;
  system_open: number;
  outstanding_amount: number;
};

function rate(row: Row): number | null {
  return row.visible_total > 0
    ? (row.responded + row.closed) / row.visible_total
    : null;
}

function rateColor(r: number | null): string {
  if (r == null) return "bg-gray-200";
  if (r >= 0.8) return "bg-brand-green";
  if (r >= 0.5) return "bg-amber-400";
  return "bg-red-500";
}

const money = (n: number) => `RM ${Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function Dashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("outlet_performance").select("*").order("code");

  if (error) {
    return <p className="text-red-700">Failed to load dashboard: {error.message}</p>;
  }

  const rows = (data ?? []) as Row[];
  const totals = rows.reduce(
    (a, r) => ({
      visible: a.visible + r.visible_total,
      awaiting: a.awaiting + r.awaiting,
      answered: a.answered + r.responded + r.closed,
      outstanding: a.outstanding + Number(r.outstanding_amount),
      systemOpen: a.systemOpen + r.system_open,
    }),
    { visible: 0, awaiting: 0, answered: 0, outstanding: 0, systemOpen: 0 },
  );
  const overallRate = totals.visible > 0 ? totals.answered / totals.visible : null;

  // Worst responders first (most outstanding to chase).
  const sorted = [...rows].sort((a, b) => b.awaiting - a.awaiting || b.outstanding_amount - a.outstanding_amount);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Outlet performance</h1>
      <p className="mt-1 text-sm text-gray-600">
        How each outlet is keeping up with their reconciliation cases.
      </p>

      {/* Summary tiles */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Tile label="Response rate" value={overallRate == null ? "—" : `${Math.round(overallRate * 100)}%`} accent />
        <Tile label="Awaiting outlets" value={String(totals.awaiting)} />
        <Tile label="Outstanding" value={money(totals.outstanding)} />
        <Tile label="System / hidden open" value={String(totals.systemOpen)} />
      </div>

      {/* Per-outlet table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-brand-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Outlet</th>
              <th className="px-4 py-2 font-medium">Response rate</th>
              <th className="px-4 py-2 font-medium">Awaiting</th>
              <th className="px-4 py-2 font-medium">Responded</th>
              <th className="px-4 py-2 font-medium">Closed</th>
              <th className="px-4 py-2 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((r) => {
              const rr = rate(r);
              return (
                <tr key={r.outlet_id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.code}</div>
                    <div className="text-xs text-gray-400">{r.zeoniq_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full ${rateColor(rr)}`}
                          style={{ width: `${rr == null ? 0 : Math.round(rr * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {rr == null ? "—" : `${Math.round(rr * 100)}%`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.awaiting > 0 ? (
                      <span className="font-semibold text-brand-orange">{r.awaiting}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.responded}</td>
                  <td className="px-4 py-3 text-gray-700">{r.closed}</td>
                  <td className="px-4 py-3 text-gray-700">{money(r.outstanding_amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Response rate = responded or closed, out of all cases visible to the outlet.
        Outstanding = total variance on cases still awaiting the outlet.
      </p>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-brand-orange/30 bg-brand-orange/5" : "border-gray-200 bg-brand-white"}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}
