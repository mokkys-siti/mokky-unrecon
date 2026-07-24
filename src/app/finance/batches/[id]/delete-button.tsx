"use client";

import { deleteBatchAction } from "./actions";

export function DeleteBatchButton({ batchId }: { batchId: string }) {
  return (
    <form
      action={deleteBatchAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Delete this batch and all its cases? Use this if you uploaded the wrong file. You can then re-upload the correct one.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="batchId" value={batchId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Delete this batch (wrong file)
      </button>
    </form>
  );
}
