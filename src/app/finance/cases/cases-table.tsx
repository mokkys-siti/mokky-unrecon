"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { bulkCloseCases, type BulkState } from "./actions";

type Line = { side: "POS" | "PG"; external_ref: string | null };
export type CaseRow = {
  id: string;
  gateway_code: string;
  business_date: string | null;
  case_type: string;
  classification: string | null;
  status: string;
  pos_amount: number | null;
  pg_amount: number | null;
  variance: number | null;
  outlet_visible: boolean;
  outlets: { code: string } | { code: string }[] | null;
  reason_codes: { label: string } | { label: string }[] | null;
  case_lines: Line[];
};

const initial: BulkState = { error: null, closed: 0 };

function one<T extends object>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}
function money(n: number | null) {
  return n == null ? "—" : `RM ${n.toFixed(2)}`;
}

export function CasesTable({ cases, canBulk }: { cases: CaseRow[]; canBulk: boolean }) {
  const [state, action, pending] = useActionState(bulkCloseCases, initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  if (cases.length === 0) {
    return <p className="rounded-xl bg-brand-white px-4 py-8 text-center text-sm text-gray-400">No cases in this view.</p>;
  }

  return (
    <form action={action}>
      {canBulk && (
        <div className="mb-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-green-950 disabled:opacity-50"
          >
            {pending ? "Closing…" : `Close selected (${selected.size})`}
          </button>
          {state.error && <span className="text-sm text-red-700">{state.error}</span>}
          {state.closed > 0 && <span className="text-sm text-green-700">Closed {state.closed}.</span>}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-brand-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {canBulk && <th className="px-3 py-2" />}
              <th className="px-3 py-2 font-medium">Outlet</th>
              <th className="px-3 py-2 font-medium">Gateway</th>
              <th className="px-3 py-2 font-medium">Ref</th>
              <th className="px-3 py-2 font-medium">POS</th>
              <th className="px-3 py-2 font-medium">PG</th>
              <th className="px-3 py-2 font-medium">Class</th>
              <th className="px-3 py-2 font-medium">Reason</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cases.map((c) => {
              const outlet = one(c.outlets);
              const reason = one(c.reason_codes);
              const ref =
                c.case_lines.find((l) => l.side === "POS")?.external_ref ??
                c.case_lines.find((l) => l.side === "PG")?.external_ref ??
                "—";
              return (
                <tr key={c.id}>
                  {canBulk && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        name="caseIds"
                        value={c.id}
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 accent-brand-orange"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-semibold text-gray-900">{outlet?.code ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{c.gateway_code}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{ref}</td>
                  <td className="px-3 py-2 text-gray-700">{money(c.pos_amount)}</td>
                  <td className="px-3 py-2 text-gray-700">{money(c.pg_amount)}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {c.classification}
                    {!c.outlet_visible && <span className="ml-1 text-[10px] uppercase text-gray-400">hidden</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{reason?.label ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{c.status}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/finance/cases/${c.id}`} className="font-medium text-brand-orange hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
