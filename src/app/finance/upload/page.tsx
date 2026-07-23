"use client";

import Link from "next/link";
import { useActionState } from "react";
import { uploadRecon, type UploadState } from "./actions";

const initial: UploadState = { results: [] };

export default function UploadPage() {
  const [state, action, pending] = useActionState(uploadRecon, initial);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Upload recon files</h1>
      <p className="mt-1 text-sm text-gray-600">
        Select one or more <code>.xlsx</code> recon workbooks (you can pick all
        outlets at once). Each is parsed and staged for review — nothing is
        published automatically.
      </p>

      <form action={action} className="mt-6 rounded-xl border border-gray-200 bg-brand-white p-6">
        <label
          htmlFor="files"
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-brand-orange"
        >
          <span className="font-medium text-gray-700">Choose files or drag them here</span>
          <span className="mt-1 text-xs text-gray-500">.xlsx only</span>
          <input
            id="files"
            name="files"
            type="file"
            accept=".xlsx"
            multiple
            required
            className="mt-4 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "Parsing…" : "Parse and stage"}
        </button>
      </form>

      {state.results.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Results</h2>
          {state.results.map((r, i) => (
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
