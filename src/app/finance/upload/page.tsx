"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { processUploads, type FileResult, type UploadItem } from "./actions";

function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 100) || "file.xlsx";
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [results, setResults] = useState<FileResult[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setBusy(true);
    setResults([]);

    const supabase = createClient();
    const items: UploadItem[] = [];
    const failed: FileResult[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setPhase(`Uploading ${i + 1} of ${files.length}: ${f.name}`);
        const path = `staging/${Date.now()}-${i}-${sanitize(f.name)}`;
        const { error } = await supabase.storage
          .from("recon-uploads")
          .upload(path, f, { upsert: true, contentType: f.type || undefined });
        if (error) {
          failed.push({ fileName: f.name, ok: false, message: `Upload failed: ${error.message}` });
        } else {
          items.push({ path, filename: f.name });
        }
      }

      if (items.length > 0) {
        setPhase(`Parsing ${items.length} file(s)…`);
        const { results: parsed } = await processUploads(items);
        setResults([...failed, ...parsed]);
      } else {
        setResults(failed);
      }
    } catch (err) {
      setResults([{ fileName: "—", ok: false, message: (err as Error).message }]);
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Upload recon files</h1>
      <p className="mt-1 text-sm text-gray-600">
        Select one or more <code>.xlsx</code> recon workbooks — you can pick all
        outlets at once. Each is parsed and staged for review; nothing is
        published automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-gray-200 bg-brand-white p-6">
        <label
          htmlFor="files"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-brand-orange"
        >
          <span className="font-medium text-gray-700">Choose files or drag them here</span>
          <span className="mt-1 text-xs text-gray-500">.xlsx only · all outlets at once is fine</span>
          <input
            id="files"
            type="file"
            accept=".xlsx"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-4 text-sm"
          />
        </label>

        {files.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">{files.length} file(s) selected</p>
        )}

        <button
          type="submit"
          disabled={busy || files.length === 0}
          className="mt-4 w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? phase || "Working…" : "Upload and parse"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Results</h2>
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg border px-4 py-3 text-sm ${
                r.ok
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{r.fileName}</span>
                {r.ok && r.batchId ? (
                  <Link
                    href={`/finance/batches/${r.batchId}`}
                    className="shrink-0 font-semibold text-brand-orange hover:underline"
                  >
                    Review →
                  </Link>
                ) : null}
              </div>
              <p className="mt-0.5">{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
