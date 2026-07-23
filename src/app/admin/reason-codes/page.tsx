import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ReasonCode } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function ReasonCodesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reason_codes")
    .select("*")
    .order("sort_order");

  if (error) {
    return <p className="text-red-700">Failed to load reason codes: {error.message}</p>;
  }

  const rows = (data ?? []) as ReasonCode[];
  const groups = [...new Set(rows.map((r) => r.group_name ?? "Ungrouped"))];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Reason codes</h1>
      <p className="mt-1 text-sm text-gray-600">
        {rows.length} codes. Outlets pick one of these when answering a case.
      </p>

      <div className="mt-6 space-y-8">
        {groups.map((group) => (
          <section key={group}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {group}
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Label</th>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Evidence</th>
                    <th className="px-4 py-2 font-medium">Scope</th>
                    <th className="px-4 py-2 font-medium">Active</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows
                    .filter((r) => (r.group_name ?? "Ungrouped") === group)
                    .map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {r.label}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {r.code}
                        </td>
                        <td className="px-4 py-2">
                          {r.requires_evidence ? (
                            <span className="text-brand-orange">Required</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {r.applies_to_outlets?.join(", ") ?? "All outlets"}
                        </td>
                        <td className="px-4 py-2">
                          {r.is_active ? (
                            <span className="rounded-full bg-brand-green/20 px-2 py-0.5 text-xs font-medium text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                              Off
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/admin/reason-codes/${r.id}`}
                            className="font-medium text-brand-orange hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
