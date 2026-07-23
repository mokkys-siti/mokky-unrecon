"use client";

import { useActionState, useMemo, useState } from "react";
import { submitResponse, type AnswerState } from "./actions";

export type ReasonOption = {
  id: string;
  code: string;
  label: string;
  group: string | null;
  requiresEvidence: boolean;
};

const initial: AnswerState = { error: null };

export function AnswerForm({
  caseId,
  reasons,
  isConfirm,
  suggestedReasonId,
}: {
  caseId: string;
  reasons: ReasonOption[];
  isConfirm: boolean;
  suggestedReasonId: string | null;
}) {
  const [state, action, pending] = useActionState(submitResponse, initial);
  const [reasonId, setReasonId] = useState<string>(
    isConfirm && suggestedReasonId ? suggestedReasonId : "",
  );

  const groups = useMemo(() => {
    const map = new Map<string, ReasonOption[]>();
    for (const r of reasons) {
      const g = r.group ?? "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return [...map.entries()];
  }, [reasons]);

  const selected = reasons.find((r) => r.id === reasonId);
  const evidenceRequired = selected?.requiresEvidence ?? false;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-gray-200 bg-brand-white p-4">
      <input type="hidden" name="caseId" value={caseId} />

      <div>
        <label htmlFor="reasonId" className="mb-1 block text-sm font-medium text-gray-700">
          {isConfirm ? "Confirm the reason" : "What happened?"}
        </label>
        <select
          id="reasonId"
          name="reasonId"
          required
          value={reasonId}
          onChange={(e) => setReasonId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
        >
          <option value="">Choose a reason…</option>
          {groups.map(([g, items]) => (
            <optgroup key={g} label={g}>
              {items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="remarks" className="mb-1 block text-sm font-medium text-gray-700">
          Remarks <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="remarks"
          name="remarks"
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          placeholder="Anything that helps finance"
        />
      </div>

      <div>
        <label htmlFor="evidence" className="mb-1 block text-sm font-medium text-gray-700">
          Photo evidence{" "}
          {evidenceRequired ? (
            <span className="text-brand-orange">(required)</span>
          ) : (
            <span className="text-gray-400">(optional)</span>
          )}
        </label>
        <input
          id="evidence"
          name="evidence"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="block w-full text-sm"
        />
        {evidenceRequired && (
          <p className="mt-1 text-xs text-brand-orange">
            This reason needs a photo (receipt, screen, or slip).
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-green px-4 py-3 text-base font-semibold text-green-950 transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Submitting…" : isConfirm ? "Acknowledge" : "Submit answer"}
      </button>
    </form>
  );
}
