import { tenderCore } from "./tenders";
import type { CaseType } from "./parse";

// Classification engine. Rule OUTCOMES + priority + is_active come from the
// classification_rules table (editable config); the CONDITION for each rule is
// bound in code by rule_key (conditions aren't a DSL). Rules are evaluated by
// ascending priority, first match wins.

export type ClassificationRule = {
  ruleKey: string | null;
  priority: number;
  classification: string;
  faultOwner: string;
  outletVisible: boolean;
  autoClose: boolean;
};

export type ClassifyInput = {
  caseType: CaseType;
  tender: string | null;
  adjTender: string | null;
  variance: number; // pg - pos
  toleranceMin: number;
  toleranceMax: number;
};

export type ClassifyResult = {
  ruleKey: string | null;
  classification: string;
  faultOwner: string;
  outletVisible: boolean;
  autoClose: boolean;
};

function matches(ruleKey: string, i: ClassifyInput): boolean {
  const t = tenderCore(i.tender);
  const a = tenderCore(i.adjTender);
  const withinTol = i.variance >= i.toleranceMin && i.variance <= i.toleranceMax;

  switch (ruleKey) {
    case "GRAB_GF_TO_GP":
      return i.caseType === "VARIANCE" && t === "GF" && a === "GP";
    case "WITHIN_TOLERANCE":
      return i.caseType === "VARIANCE" && t === a && withinTol;
    case "OVER_TOLERANCE":
      return i.caseType === "VARIANCE" && t === a && !withinTol;
    case "TENDER_MISMATCH":
      return i.caseType === "VARIANCE" && t !== a;
    case "NO_COUNTERPARTY":
      return i.caseType !== "VARIANCE";
    default:
      return false;
  }
}

export function classifyCase(
  input: ClassifyInput,
  rules: ClassificationRule[],
): ClassifyResult {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);
  for (const r of ordered) {
    if (r.ruleKey && matches(r.ruleKey, input)) {
      return {
        ruleKey: r.ruleKey,
        classification: r.classification,
        faultOwner: r.faultOwner,
        outletVisible: r.outletVisible,
        autoClose: r.autoClose,
      };
    }
  }
  // No rule matched — safest is an open, outlet-visible case (rule-99 semantics).
  return {
    ruleKey: null,
    classification: "OPEN",
    faultOwner: "OUTLET",
    outletVisible: true,
    autoClose: false,
  };
}
