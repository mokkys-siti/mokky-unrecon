import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Perf = {
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

type GwRow = {
  outlet_id: string;
  code: string;
  gateway_code: string;
  unrecon_count: number;
  unrecon_amount: number;
};

const money = (n: number) =>
  `RM ${Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function rateColor(r: number | null): string {
  if (r == null) return "bg-gray-200";
  if (r >= 0.8) return "bg-brand-green";
  if (r >= 0.5) return "bg-amber-400";
  return "bg-red-500";
}

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: perfData, error: perfErr }, { data: gwData, error: gwErr }] = await Promise.all([
    supabase.from("outlet_performance").select("*"),
    supabase.from("unrecon_by_outlet_gateway").select("*"),
  ]);

  if (perfErr || gwErr) {
    return <p className="text-red-700">Failed to load dashboard: {(perfErr ?? gwErr)?.message}</p>;
  }

  const perf = (perfData ?? []) as Perf[];
  const gw = ((gwData ?? []) as GwRow[]).map((g) => ({
    ...g,
    unrecon_count: Number(g.unrecon_count),
    unrecon_amount: Number(g.unrecon_amount),
  }));

  // Per-outlet unrecon totals + gateway breakdown
  const byOutlet = new Map<string, { total: number; amount: number; gateways: GwRow[] }>();
  for (const g of gw) {
    const e = byOutlet.get(g.outlet_id) ?? { total: 0, amount: 0, gateways: [] };
    e.total += g.unrecon_count;
    e.amount += g.unrecon_amount;
    e.gateways.push(g);
    byOutlet.set(g.outlet_id, e);
  }
  for (const e of byOutlet.values()) e.gateways.sort((a, b) => b.unrecon_count - a.unrecon_count);

  // Overall by gateway
  const byGateway = new Map<string, { count: number; amount: number }>();
  for (const g of gw) {
    const e = byGateway.get(g.gateway_code) ?? { count: 0, amount: 0 };
    e.count += g.unrecon_count;
    e.amount += g.unrecon_amount;
    byGateway.set(g.gateway_code, e);
  }
  const gatewayRanked = [...byGateway.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxGatewayCount = gatewayRanked[0]?.[1].count ?? 0;

  // Outlets ranked by unrecon items, highest -> lowest
  const ranked = [...perf]
    .map((p) => ({ p, u: byOutlet.get(p.outlet_id) ?? { total: 0, amount: 0, gateways: [] as GwRow[] } }))
    .sort((a, b) => b.u.total - a.u.total || b.u.amount - a.u.amount);

  const totalUnrecon = gw.reduce((n, g) => n + g.unrecon_count, 0);
  const totalUnreconAmt = gw.reduce((n, g) => n + g.unrecon_amount, 0);
  const totals = perf.reduce(
    (a, r) => ({
      visible: a.visible + r.visible_total,
      answered: a.answered + r.responded + r.closed,
      systemOpen: a.systemOpen + r.system_open,
    }),
    { visible: 0, answered: 0, systemOpen: 0 },
  );
  const overallRate = totals.visible > 0 ? totals.answered / totals.visible : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Outlet performance</h1>
      <p className="mt-1 text-sm text-gray-600">
        Where the unreconciled items are — by outlet, and which payment gateway they came from.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Tile label="Open unrecon items" value={String(totalUnrecon)} accent />
        <Tile label="Unrecon value" value={money(totalUnreconAmt)} />
        <Tile label="Response rate" value={overallRate == null ? "—" : `${Math.round(overallRate * 100)}%`} />
        <Tile label="System / hidden open" value={String(totals.systemOpen)} />
      </div>

      {/* Which PG the unrecon comes from */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700">Unrecon by payment gateway</h2>
        <p className="mb-3 text-xs text-gray-500">Across all outlets, highest first.</p>
        {gatewayRanked.length === 0 ? (
          <p className="rounded-xl bg-brand-white px-4 py-6 text-center text-sm text-gray-400">
            No open unrecon items.
          </p>
        ) : (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-brand-white p-4">
            {gatewayRanked.map(([code, v]) => (
              <div key={code} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-medium text-gray-700">{code}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-orange"
                    style={{ width: `${maxGatewayCount ? (v.count / maxGatewayCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-xs font-semibold text-gray-900">{v.count}</span>
                <span className="w-28 shrink-0 text-right text-xs text-gray-500">{money(v.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outlets ranked by unrecon items */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700">Outlets by unrecon items</h2>
        <p className="mb-3 text-xs text-gray-500">Highest to lowest, with the gateways each one came from.</p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-brand-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Outlet</th>
                <th className="px-4 py-2 font-medium">Unrecon</th>
                <th className="px-4 py-2 font-medium">From which gateway</th>
                <th className="px-4 py-2 font-medium">Response rate</th>
                <th className="px-4 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranked.map(({ p, u }, i) => {
                const rr = p.visible_total > 0 ? (p.responded + p.closed) / p.visible_total : null;
                return (
                  <tr key={p.outlet_id} className={u.total === 0 ? "opacity-60" : ""}>
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.code}</div>
                      <div className="text-xs text-gray-400">{p.zeoniq_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold ${u.total > 0 ? "text-brand-orange" : "text-gray-300"}`}>
                        {u.total}
                      </span>
                      {p.awaiting > 0 && (
                        <div className="text-[11px] text-gray-500">{p.awaiting} awaiting outlet</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.gateways.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.gateways.map((g) => (
                            <span
                              key={g.gateway_code}
                              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                              title={money(g.unrecon_amount)}
                            >
                              {g.gateway_code} <span className="font-semibold">{g.unrecon_count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${rateColor(rr)}`} style={{ width: `${rr == null ? 0 : Math.round(rr * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{rr == null ? "—" : `${Math.round(rr * 100)}%`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{money(u.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-3 text-xs text-gray-400">
        Unrecon = cases not yet closed (includes system/hidden items). Response rate =
        responded or closed, out of all cases visible to that outlet.
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
