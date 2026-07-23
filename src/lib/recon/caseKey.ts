import type { DraftCase } from "./parse";

// Deterministic natural key so re-imports are idempotent: an unresolved case
// from last fortnight ages up (batch_id updated), it is not re-created.
// Shape: outlet_code | gateway | business_date | side | external_ref | amount.

export function caseExternalRef(c: DraftCase): string | null {
  const pos = c.lines.find((l) => l.side === "POS");
  const pg = c.lines.find((l) => l.side === "PG");
  if (c.caseType === "PAYMENT_NO_BILL") return pg?.externalRef ?? null;
  return pos?.billNo ?? pos?.externalRef ?? pg?.externalRef ?? null;
}

export function caseAmount(c: DraftCase): number | null {
  return c.caseType === "PAYMENT_NO_BILL" ? c.pgAmount : c.posAmount;
}

export function buildCaseKey(outletCode: string, c: DraftCase): string {
  const side =
    c.caseType === "BILL_NO_PAYMENT"
      ? "POS"
      : c.caseType === "PAYMENT_NO_BILL"
        ? "PG"
        : "VAR";
  const ref = caseExternalRef(c) ?? "";
  const amount = caseAmount(c);
  return [
    outletCode,
    c.gatewayCode || "?",
    c.businessDate ?? "",
    side,
    ref,
    amount == null ? "" : amount.toFixed(2),
  ].join("|");
}
