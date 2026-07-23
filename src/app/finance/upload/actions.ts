"use server";

import crypto from "node:crypto";
import { read } from "xlsx";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { isFinanceRole } from "@/lib/auth/roles";
import { stageBatch } from "@/lib/recon/ingest";

export type FileResult = {
  fileName: string;
  ok: boolean;
  message: string;
  batchId?: string;
};

export type UploadItem = { path: string; filename: string };

function extractPeriod(name: string): string | null {
  const m = name.match(/(\d{4})[._-](\d{2})[._-]?([Ww]\d+)?/);
  if (!m) return null;
  return `${m[1]}.${m[2]}${m[3] ? "_" + m[3].toUpperCase() : ""}`;
}

/**
 * Parse files that were already uploaded to the private recon-uploads bucket by
 * the browser. Only small path strings cross the Server Action boundary, so the
 * request-body cap never applies — finance can stage all outlets at once.
 */
export async function processUploads(
  items: UploadItem[],
): Promise<{ results: FileResult[] }> {
  const session = await getSession();
  const allowed =
    session &&
    (session.appRole === "admin" ||
      (session.appRole && isFinanceRole(session.appRole)));
  if (!session || !allowed) {
    return { results: [{ fileName: "—", ok: false, message: "Not authorized." }] };
  }

  const supabase = await createClient();
  const results: FileResult[] = [];

  for (const item of items) {
    try {
      const { data: blob, error } = await supabase.storage
        .from("recon-uploads")
        .download(item.path);
      if (error || !blob) throw new Error("Could not read the uploaded file.");

      const buf = Buffer.from(await blob.arrayBuffer());
      const fileHash = crypto.createHash("sha256").update(buf).digest("hex");
      const workbook = read(buf, { type: "buffer" });

      const res = await stageBatch(supabase, {
        workbook,
        fileName: item.filename,
        fileHash,
        periodLabel: extractPeriod(item.filename),
        uploadedBy: session.userId,
      });
      const warn = res.feedWarnings.length
        ? ` — ${res.feedWarnings.length} feed warning(s)`
        : "";
      results.push({
        fileName: item.filename,
        ok: true,
        message: `${res.outletCode}: ${res.created} new, ${res.agedUp} aged up${warn}`,
        batchId: res.batchId,
      });
    } catch (e) {
      results.push({ fileName: item.filename, ok: false, message: (e as Error).message });
    } finally {
      await supabase.storage.from("recon-uploads").remove([item.path]);
    }
  }

  revalidatePath("/finance/batches");
  return { results };
}
