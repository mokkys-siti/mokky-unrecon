import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ClassificationRule } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function ClassificationRulesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classification_rules")
    .select("*")
    .order("priority");

  if (error) {
    return <p className="text-red-700">Failed to load rules: {error.message}</p>;
  }

  const rows = (data ?? []) as ClassificationRule[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Classification rules</h1>
      <p className="mt-1 text-sm text-gray-600">
        Evaluated in priority order (low to high); the first match wins.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Classification</th>
              <th className="px-4 py-2 font-medium">Fault owner</th>
              <th className="px-4 py-2 font-medium">Outlet</th>
              <th className="px-4 py-2 font-medium">Auto-close</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-gray-700">{r.priority}</td>
                <td className="px-4 py-2 font-medium text-gray-900">
                  {r.name}
                  {r.condition ? (
                    <span className="block text-xs font-normal text-gray-500">
                      {r.condition}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2 text-gray-700">{r.classification}</td>
                <td className="px-4 py-2 text-gray-700">{r.fault_owner}</td>
                <td className="px-4 py-2">{r.outlet_visible ? "Visible" : "Hidden"}</td>
                <td className="px-4 py-2">{r.auto_close ? "Yes" : "No"}</td>
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
                    href={`/admin/classification-rules/${r.id}`}
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
    </div>
  );
}
