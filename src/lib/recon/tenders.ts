// Map a POS/PG tender code to a gateway. Used to assign a gateway to
// Interrecon (cross-tender) variance cases, which have no gateway column.
// Matched on the leading token before a '-' or space (e.g. "GP-Grab Pay" -> GP).

const TENDER_TO_GATEWAY: Record<string, string> = {
  QRPAY: "MBBQR",
  CARD: "MMP",
  MYDEBIT: "MMP",
  ODARING: "ODR_GKASH",
  GKASH: "ODR_GKASH",
  GP: "GRABPAY",
  GF: "GRABFOOD",
  FP: "FOODPANDA",
  FOODPANDA: "FOODPANDA",
  SPP: "SHOPEEFOOD",
  SHOPEEPAY: "SHOPEEFOOD",
  SHOPEE: "SHOPEEFOOD",
};

export function tenderCore(tender: string | null): string | null {
  if (!tender) return null;
  const token = tender.split(/[-\s]/)[0]?.trim().toUpperCase();
  return token || null;
}

export function gatewayFromTender(tender: string | null): string | null {
  const core = tenderCore(tender);
  return core ? (TENDER_TO_GATEWAY[core] ?? null) : null;
}
