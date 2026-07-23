// Minimal row types for the tables the admin UI edits. Hand-written (kept in
// sync with the migrations) rather than generated, to avoid a codegen step.

export type ReasonCode = {
  id: string;
  code: string;
  label: string;
  group_name: string | null;
  applies_to_outlets: string[] | null;
  applies_to_gateways: string[] | null;
  requires_evidence: boolean;
  is_active: boolean;
  sort_order: number;
};

export const CLASSIFICATIONS = [
  "OUTLET_ERROR",
  "SYSTEM",
  "ROUNDING",
  "OPEN",
] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const FAULT_OWNERS = [
  "OUTLET",
  "GATEWAY",
  "POS_SYSTEM",
  "TIMING",
  "FINANCE",
] as const;
export type FaultOwner = (typeof FAULT_OWNERS)[number];

export type ClassificationRule = {
  id: string;
  priority: number;
  name: string;
  tender_from: string | null;
  tender_to: string | null;
  condition: string | null;
  classification: Classification;
  fault_owner: FaultOwner;
  outlet_visible: boolean;
  auto_close: boolean;
  is_active: boolean;
};
