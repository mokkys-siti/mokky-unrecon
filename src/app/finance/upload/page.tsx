import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Uploader } from "./uploader";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  parsing: "bg-gray-100 text-gray-600",
  review: "bg-amber-100 text-amber-800",
  published: "bg-brand-green/20 text-green-800",
  failed: "bg-red-100 text-red-700",
};

type Recent = {
  id: string;
  source_filename: string | null;
  status: string;
  uploaded_at: string;
  outlets: { code: string } | { code: string }[] | null;
};

function outletCode(o: Recent["outlets"]): string {
  if (!o) return "—";
  return Array.isArray(o) ? (o[0]?.code ?? "—") : o.code;
}

export default async function UploadPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recon_batches")
    .select("id, source_filename, status, uploaded_at, outlets(code)")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false })
    .limit(10);
  const recent = (data ?? []) as Recent[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Upload recon files</h1>
      <p className="mt-1 text-sm text-gray-600">
        Choose one or more <code>.xlsx</code> recon workbooks — all outlets at once
        is fine. Each file becomes its own batch (files are never merged), and nothing
        publishes automatically.
      </p>

      <div className="mt-6">
        <Uploader />
      </div>

      {/* Recent uploads — so the record is visible here, not only under Batches */}
      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recently uploaded</h2>
          <Link href="/finance/batches" className="text-sm font-medium text-brand-orange hover:underline">
            All batches →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl bg-brand-white px-4 py-6 text-center text-sm text-gray-400">
            No batches yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
            {recent.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link href={`/finance/batches/${b.id}`} className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-gray-900">{outletCode(b.outlets)}</span>
                  <span className="ml-2 truncate text-gray-500">{b.source_filename}</span>
                </Link>
                <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] ?? ""}`}>
                  {b.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
