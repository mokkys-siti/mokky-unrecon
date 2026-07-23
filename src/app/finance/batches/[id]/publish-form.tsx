"use client";

import { useActionState } from "react";
import { publishBatchAction, type PublishState } from "./actions";

const initial: PublishState = { error: null, published: false };

export function PublishForm({
  batchId,
  hasWarnings,
}: {
  batchId: string;
  hasWarnings: boolean;
}) {
  const [state, action, pending] = useActionState(publishBatchAction, initial);

  return (
    <form action={action} className="rounded-xl border border-gray-200 bg-brand-white p-6">
      <input type="hidden" name="batchId" value={batchId} />
      <h2 className="font-semibold text-gray-900">Publish to outlet</h2>
      <p className="mt-1 text-sm text-gray-600">
        Publishing makes outlet-visible cases available for the outlet to answer.
        Prior open cases absent from this file are auto-closed as cleared.
      </p>

      {hasWarnings && (
        <div className="mt-3">
          <label htmlFor="override" className="mb-1 block text-sm font-medium text-gray-700">
            Override reason (required — feed warnings present)
          </label>
          <textarea
            id="override"
            name="override"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
            placeholder="e.g. FoodPanda had no transactions this fortnight — confirmed with outlet."
          />
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-green-950 transition hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Confirm and publish"}
      </button>
    </form>
  );
}
