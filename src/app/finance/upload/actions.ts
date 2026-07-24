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
  outletCode?: string;
};

function extractPeriod(name: string): string | null {
  const m = name.match(/(\d{4})[._-](\d{2})[._-]?([Ww]\d+)?/);
  if (!m) return null;
  return `${m[1]}.${m[2]}${m[3] ? "_" + m[3].toUpperCase() : ""}`;
}

/**
 * Parse and stage ONE recon workbook. The browser calls this once per selected
 * file, so each request carries a single ~1.7 MB file — comfortably under any
 * platform request cap — and the anon key is read server-side at runtime (no
 * dependency on client-bundle env). Returns a per-file result.
 */
export async function uploadReconFile(formData: FormData): Promise<FileResult> {
  const file = formData.get("file");
  const fileName = file instanceof File ? file.name : "unknown";

  const session = await getSession();
  const allowed =
    session &&
    (session.appRole === "admin" ||
      (session.appRole && isFinanceRole(session.appRole)));
  if (!session || !allowed) {
    return { fileName, ok: false, message: "Not authorized." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { fileName, ok: false, message: "Empty or missing file." };
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buf).digest("hex");
    const workbook = read(buf, { type: "buffer" });

    const supabase = await createClient();
    const res = await stageBatch(supabase, {
      workbook,
      fileName,
      fileHash,
      periodLabel: extractPeriod(fileName),
      uploadedBy: session.userId,
    });

    revalidatePath("/finance/batches");
    const warn = res.feedWarnings.length ? ` · ${res.feedWarnings.length} feed warning(s)` : "";
    return {
      fileName,
      ok: true,
      message: `${res.created} new, ${res.agedUp} aged up${warn}`,
      batchId: res.batchId,
      outletCode: res.outletCode,
    };
  } catch (e) {
    return { fileName, ok: false, message: (e as Error).message };
  }
}
