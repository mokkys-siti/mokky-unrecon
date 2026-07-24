"use client";

import { deleteBatchAction } from "./actions";

export function DeleteBatchButton({
  batchId,
  published = false,
  compact = false,
  label,
}: {
  batchId: string;
  published?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const message = published
    ? "This batch is PUBLISHED — the outlet can already see these cases. Deleting withdraws them and discards any answers the outlet has already submitted. Continue?"
    : "Delete this batch and all its cases? Use this if you uploaded the wrong file — you can re-upload the correct one afterwards.";

  return (
    <form
      action={deleteBatchAction}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="batchId" value={batchId} />
      <button
        type="submit"
        className={
          compact
            ? "text-sm font-medium text-red-600 hover:underline"
            : "rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        }
      >
        {label ?? "Delete"}
      </button>
    </form>
  );
}
