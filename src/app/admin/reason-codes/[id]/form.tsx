"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateReasonCode, type ReasonCodeFormState } from "../actions";
import type { ReasonCode } from "@/lib/db/types";

const initial: ReasonCodeFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";

export function ReasonCodeForm({ reason }: { reason: ReasonCode }) {
  const [state, action, pending] = useActionState(updateReasonCode, initial);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/admin/reason-codes"
        className="text-sm text-gray-500 hover:text-brand-orange"
      >
        ← Back to reason codes
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit reason code</h1>
      <p className="mt-1 font-mono text-xs text-gray-500">{reason.code}</p>

      <form action={action} className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-brand-white p-6">
        <input type="hidden" name="id" value={reason.id} />

        <div>
          <label htmlFor="label" className="mb-1 block text-sm font-medium text-gray-700">
            Label
          </label>
          <input id="label" name="label" defaultValue={reason.label} required className={inputClass} />
        </div>

        <div>
          <label htmlFor="group_name" className="mb-1 block text-sm font-medium text-gray-700">
            Group
          </label>
          <input
            id="group_name"
            name="group_name"
            defaultValue={reason.group_name ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="applies_to_outlets" className="mb-1 block text-sm font-medium text-gray-700">
            Applies to outlets
          </label>
          <input
            id="applies_to_outlets"
            name="applies_to_outlets"
            defaultValue={reason.applies_to_outlets?.join(", ") ?? ""}
            placeholder="Leave blank for all outlets (e.g. OGD, ZGD)"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">
            Comma-separated outlet codes. Blank = every outlet.
          </p>
        </div>

        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-medium text-gray-700">
            Sort order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={reason.sort_order}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="requires_evidence"
            defaultChecked={reason.requires_evidence}
            className="h-4 w-4 accent-brand-orange"
          />
          Requires evidence (photo) when chosen
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={reason.is_active}
            className="h-4 w-4 accent-brand-orange"
          />
          Active (shown to outlets)
        </label>

        {state.error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/admin/reason-codes"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
