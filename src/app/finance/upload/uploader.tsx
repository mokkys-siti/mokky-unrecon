"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { uploadReconFile, type FileResult } from "./actions";

function kb(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Uploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<FileResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".xlsx"));
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...incoming.filter((f) => !seen.has(f.name + f.size))];
    });
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function upload() {
    if (files.length === 0) return;
    setBusy(true);
    setResults([]);
    setDone(0);
    const acc: FileResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      let r: FileResult;
      try {
        r = await uploadReconFile(fd);
      } catch (e) {
        r = { fileName: files[i].name, ok: false, message: (e as Error).message };
      }
      acc.push(r);
      setResults([...acc]);
      setDone(i + 1);
    }
    setBusy(false);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  const okCount = results.filter((r) => r.ok).length;

  return (
    <div>
      <label
        htmlFor="files"
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-brand-white px-6 py-10 text-center hover:border-brand-orange"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <span className="font-medium text-gray-700">Choose files or drag them here</span>
        <span className="mt-1 text-xs text-gray-500">.xlsx only</span>
        <input
          id="files"
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="mt-4 text-sm"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">{files.length} file(s) chosen</h2>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-brand-white">
            {files.map((f, i) => (
              <li key={f.name + f.size} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="truncate text-gray-800">{f.name}</span>
                <span className="ml-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400">{kb(f.size)}</span>
                  {!busy && (
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label={`Remove ${f.name}`}
                    >
                      ✕
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={upload}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {busy ? `Uploading ${done} of ${files.length}…` : `Upload ${files.length} file(s)`}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            Uploaded — {okCount} of {results.length} parsed
          </h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  r.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {r.outletCode ? `${r.outletCode} · ` : ""}
                    {r.fileName}
                  </span>
                  {r.ok && r.batchId ? (
                    <Link href={`/finance/batches/${r.batchId}`} className="shrink-0 font-semibold text-brand-orange hover:underline">
                      Review →
                    </Link>
                  ) : null}
                </div>
                <p className="mt-0.5">{r.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
