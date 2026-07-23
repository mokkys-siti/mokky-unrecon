"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  updateClassificationRule,
  type RuleFormState,
} from "../actions";
import {
  CLASSIFICATIONS,
  FAULT_OWNERS,
  type ClassificationRule,
} from "@/lib/db/types";

const initial: RuleFormState = { error: null };

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30";

export function ClassificationRuleForm({ rule }: { rule: ClassificationRule }) {
  const [state, action, pending] = useActionState(
    updateClassificationRule,
    initial,
  );

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/admin/classification-rules"
        className="text-sm text-gray-500 hover:text-brand-orange"
      >
        ← Back to classification rules
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit rule</h1>

      <form
        action={action}
        className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-brand-white p-6"
      >
        <input type="hidden" name="id" value={rule.id} />

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="priority" className="mb-1 block text-sm font-medium text-gray-700">
              Priority
            </label>
            <input
              id="priority"
              name="priority"
              type="number"
              defaultValue={rule.priority}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input id="name" name="name" defaultValue={rule.name} required className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="condition" className="mb-1 block text-sm font-medium text-gray-700">
            Condition (description)
          </label>
          <input
            id="condition"
            name="condition"
            defaultValue={rule.condition ?? ""}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="classification" className="mb-1 block text-sm font-medium text-gray-700">
              Classification
            </label>
            <select
              id="classification"
              name="classification"
              defaultValue={rule.classification}
              className={inputClass}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fault_owner" className="mb-1 block text-sm font-medium text-gray-700">
              Fault owner
            </label>
            <select
              id="fault_owner"
              name="fault_owner"
              defaultValue={rule.fault_owner}
              className={inputClass}
            >
              {FAULT_OWNERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="outlet_visible"
            defaultChecked={rule.outlet_visible}
            className="h-4 w-4 accent-brand-orange"
          />
          Visible to outlets
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="auto_close"
            defaultChecked={rule.auto_close}
            className="h-4 w-4 accent-brand-orange"
          />
          Auto-close on creation
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={rule.is_active}
            className="h-4 w-4 accent-brand-orange"
          />
          Active
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
            href="/admin/classification-rules"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
