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
export type UploadState = { results: FileResult[] };

function extractPeriod(name: string): string | null {
  const m = name.match(/(\d{4})[._-](\d{2})[._-]?([Ww]\d+)?/);
  if (!m) return null;
  return `${m[1]}.${m[2]}${m[3] ? "_" + m[3].toUpperCase() : ""}`;
}

export async function uploadRecon(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const session = await getSession();
  const allowed =
    session &&
    (session.appRole === "admin" ||
      (session.appRole && isFinanceRole(session.appRole)));
  if (!session || !allowed) {
    return { results: [{ fileName: "—", ok: false, message: "Not authorized." }] };
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { results: [{ fileName: "—", ok: false, message: "Choose at least one .xlsx file." }] };
  }

  const supabase = await createClient();
  const results: FileResult[] = [];

  for (const file of files) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const fileHash = crypto.createHash("sha256").update(buf).digest("hex");
      const workbook = read(buf, { type: "buffer" });
      const res = await stageBatch(supabase, {
        workbook,
        fileName: file.name,
        fileHash,
        periodLabel: extractPeriod(file.name),
        uploadedBy: session.userId,
      });
      const warn = res.feedWarnings.length
        ? ` — ${res.feedWarnings.length} feed warning(s)`
        : "";
      results.push({
        fileName: file.name,
        ok: true,
        message: `${res.outletCode}: ${res.created} new, ${res.agedUp} aged up${warn}`,
        batchId: res.batchId,
      });
    } catch (e) {
      results.push({ fileName: file.name, ok: false, message: (e as Error).message });
    }
  }

  revalidatePath("/finance/batches");
  return { results };
}
