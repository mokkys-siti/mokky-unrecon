import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  parsing: "bg-gray-100 text-gray-600",
  review: "bg-amber-100 text-amber-800",
  published: "bg-brand-green/20 text-green-800",
  failed: "bg-red-100 text-red-700",
};

type BatchRow = {
  id: string;
  period_label: string | null;
  source_filename: string | null;
  status: string;
  uploaded_at: string;
  outlets: { code: string } | { code: string }[] | null;
};

function outletCode(o: BatchRow["outlets"]): string {
  if (!o) return "—";
  return Array.isArray(o) ? (o[0]?.code ?? "—") : o.code;
}

export default async function BatchesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recon_batches")
    .select("id, period_label, source_filename, status, uploaded_at, outlets(code)")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  const rows = (data ?? []) as BatchRow[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
        <Link
          href="/finance/upload"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
        >
          Upload
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">No batches yet. Upload a recon file to begin.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Outlet</th>
                <th className="px-4 py-2 font-medium">Period</th>
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Uploaded</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 font-semibold text-gray-900">{outletCode(b.outlets)}</td>
                  <td className="px-4 py-2 text-gray-700">{b.period_label ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-2 text-gray-500">{b.source_filename}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ""}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(b.uploaded_at).toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/finance/batches/${b.id}`} className="font-medium text-brand-orange hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
