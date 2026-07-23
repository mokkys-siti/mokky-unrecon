import { describe, it, expect } from "vitest";
import { classifyCase, type ClassificationRule } from "@/lib/recon/classify";
import { buildCaseKey } from "@/lib/recon/caseKey";
import type { DraftCase } from "@/lib/recon/parse";

const RULES: ClassificationRule[] = [
  { ruleKey: "GRAB_GF_TO_GP", priority: 10, classification: "SYSTEM", faultOwner: "GATEWAY", outletVisible: false, autoClose: false },
  { ruleKey: "WITHIN_TOLERANCE", priority: 20, classification: "ROUNDING", faultOwner: "FINANCE", outletVisible: false, autoClose: true },
  { ruleKey: "OVER_TOLERANCE", priority: 30, classification: "OPEN", faultOwner: "OUTLET", outletVisible: true, autoClose: false },
  { ruleKey: "TENDER_MISMATCH", priority: 40, classification: "OUTLET_ERROR", faultOwner: "OUTLET", outletVisible: true, autoClose: false },
  { ruleKey: "NO_COUNTERPARTY", priority: 99, classification: "OPEN", faultOwner: "OUTLET", outletVisible: true, autoClose: false },
];

const tol = { toleranceMin: -0.05, toleranceMax: 0.05 };

describe("classifyCase (rules by priority, first match wins)", () => {
  it("Grab GF->GP variance is SYSTEM and hidden from outlets", () => {
    const r = classifyCase({ caseType: "VARIANCE", tender: "GF-Grab Food", adjTender: "GP-Grab Pay", variance: 5, ...tol }, RULES);
    expect(r.classification).toBe("SYSTEM");
    expect(r.outletVisible).toBe(false);
  });

  it("same tender within tolerance is ROUNDING + auto-close", () => {
    const r = classifyCase({ caseType: "VARIANCE", tender: "QRPAY-QR Pay", adjTender: "QRPAY-QR Pay", variance: 0.03, ...tol }, RULES);
    expect(r.classification).toBe("ROUNDING");
    expect(r.autoClose).toBe(true);
  });

  it("same tender beyond tolerance is OPEN and visible", () => {
    const r = classifyCase({ caseType: "VARIANCE", tender: "QRPAY", adjTender: "QRPAY", variance: 5, ...tol }, RULES);
    expect(r.classification).toBe("OPEN");
    expect(r.outletVisible).toBe(true);
  });

  it("different tenders is OUTLET_ERROR", () => {
    const r = classifyCase({ caseType: "VARIANCE", tender: "QRPAY", adjTender: "GP-Grab Pay", variance: 5, ...tol }, RULES);
    expect(r.classification).toBe("OUTLET_ERROR");
  });

  it("an orphan bill falls through to no-counterparty OPEN", () => {
    const r = classifyCase({ caseType: "BILL_NO_PAYMENT", tender: "QRPAY", adjTender: null, variance: 0, ...tol }, RULES);
    expect(r.classification).toBe("OPEN");
  });
});

describe("buildCaseKey (deterministic, idempotent)", () => {
  const draft: DraftCase = {
    caseType: "BILL_NO_PAYMENT",
    gatewayCode: "MBBQR",
    businessDate: "2026-07-14",
    posAmount: 55.1,
    pgAmount: null,
    orSequence: null,
    tender: "QRPAY-QR Pay",
    adjTender: null,
    lines: [
      { side: "POS", gatewayCode: "MBBQR", businessDate: "2026-07-14", txnDatetime: null, externalRef: "01/84716", tenderCode: "QRPAY-QR Pay", amount: 55.1, status: null, billNo: "01/84716", raw: {} },
    ],
  };

  it("is stable across identical inputs", () => {
    expect(buildCaseKey("OBJ", draft)).toBe(buildCaseKey("OBJ", draft));
  });

  it("encodes outlet, gateway, date, side, ref and amount", () => {
    expect(buildCaseKey("OBJ", draft)).toBe("OBJ|MBBQR|2026-07-14|POS|01/84716|55.10");
  });
});
