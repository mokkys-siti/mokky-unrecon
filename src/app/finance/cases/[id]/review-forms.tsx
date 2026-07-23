"use client";

import { useActionState } from "react";
import { acceptCase, rejectCase, type ReviewState } from "./actions";

const initial: ReviewState = { error: null };

export function ReviewForms({
  caseId,
  dispositions,
  canClose,
}: {
  caseId: string;
  dispositions: { id: string; label: string }[];
  canClose: boolean;
}) {
  const [acceptState, acceptAction, accepting] = useActionState(acceptCase, initial);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectCase, initial);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Accept + close */}
      <form action={acceptAction} className="rounded-xl border border-gray-200 bg-brand-white p-4">
        <input type="hidden" name="caseId" value={caseId} />
        <h3 className="text-sm font-semibold text-gray-900">Accept &amp; close</h3>
        <label htmlFor="dispositionId" className="mt-2 mb-1 block text-xs font-medium text-gray-600">
          Disposition
        </label>
        <select
          id="dispositionId"
          name="dispositionId"
          required
          disabled={!canClose}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange disabled:bg-gray-50"
        >
          <option value="">Choose…</option>
          {dispositions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        {acceptState.error && <p className="mt-2 text-xs text-red-700">{acceptState.error}</p>}
        <button
          type="submit"
          disabled={accepting || !canClose}
          className="mt-3 w-full rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-green-950 disabled:opacity-50"
        >
          {accepting ? "Closing…" : "Accept & close"}
        </button>
        {!canClose && <p className="mt-1 text-xs text-gray-400">Finance managers close cases.</p>}
      </form>

      {/* Reject / send back */}
      <form action={rejectAction} className="rounded-xl border border-gray-200 bg-brand-white p-4">
        <input type="hidden" name="caseId" value={caseId} />
        <h3 className="text-sm font-semibold text-gray-900">Send back to outlet</h3>
        <label htmlFor="note" className="mt-2 mb-1 block text-xs font-medium text-gray-600">
          Note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
          placeholder="What does the outlet need to fix or clarify?"
        />
        {rejectState.error && <p className="mt-2 text-xs text-red-700">{rejectState.error}</p>}
        <button
          type="submit"
          disabled={rejecting}
          className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {rejecting ? "Sending…" : "Send back"}
        </button>
      </form>
    </div>
  );
}
