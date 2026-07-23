import type { WorkBook, WorkSheet } from "xlsx";
import { utils } from "xlsx";
import {
  asDateISO,
  asDatetimeISO,
  asNumber,
  asString,
  cellAt,
  isError,
} from "./cells";

// ---------------------------------------------------------------------------
// Config (loaded from recon_layouts / recon_gateway_columns)
// ---------------------------------------------------------------------------
export type FieldMap = Record<string, string>; // canonical field -> column letter

export type GatewayLayout = {
  gatewayCode: string;
  sectionTitle: string;
  pos: FieldMap;
  pg: FieldMap;
  pgAmountBasis: "gross" | "payout";
};

export type ReconLayout = {
  resultsSheet: string;
  interreconSheet: string;
  resultsDataRow: number;
  interreconDataRow: number;
  checksumBillNoCell: string;
  checksumNoBillCell: string;
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
export type CaseType = "BILL_NO_PAYMENT" | "PAYMENT_NO_BILL" | "VARIANCE";

export type ParsedLine = {
  side: "POS" | "PG";
  gatewayCode: string;
  businessDate: string | null;
  txnDatetime: string | null;
  externalRef: string | null;
  tenderCode: string | null;
  amount: number | null;
  status: string | null;
  billNo: string | null;
  raw: Record<string, string | number | null>;
};

export type DraftCase = {
  caseType: CaseType;
  gatewayCode: string;
  businessDate: string | null;
  posAmount: number | null;
  pgAmount: number | null;
  orSequence: string | null;
  tender: string | null;
  adjTender: string | null;
  lines: ParsedLine[];
};

export type GatewayStat = {
  gatewayCode: string;
  rowsRead: number;
  rowsJunk: number;
  rowsKept: number;
  keptPos: number;
  keptPg: number;
  totalAmount: number;
  feedStatus: "ok" | "empty" | "error";
};

export type ParseResult = {
  outletName: string | null;
  cases: DraftCase[];
  stats: GatewayStat[];
  junk: { formulaErrors: number; shopeeSpill: number; zeroAmount: number };
  checksum: {
    fileBillNoPayment: number | null;
    filePaymentNoBill: number | null;
    parsedBillNoPayment: number;
    parsedPaymentNoBill: number;
    reconciles: boolean;
  };
};

const SHOPEE_SPILL = "diff transaction count";
const MATCHED_STATUS = "INTERRECON";

function lastRow(ws: WorkSheet): number {
  return utils.decode_range(ws["!ref"] ?? "A1").e.r + 1;
}

/** Read one side's fields for a row into a canonical line + raw bag. */
function readLine(
  ws: WorkSheet,
  side: "POS" | "PG",
  gatewayCode: string,
  map: FieldMap,
  row: number,
): { line: ParsedLine; hasError: boolean; isSpill: boolean } {
  const raw: Record<string, string | number | null> = {};
  let hasError = false;
  let isSpill = false;

  for (const [field, col] of Object.entries(map)) {
    const cell = cellAt(ws, col, row);
    if (isError(cell)) hasError = true;
    const num = asNumber(cell);
    const str = asString(cell);
    raw[field] = num ?? str ?? null;
    if (str && str.toLowerCase().startsWith(SHOPEE_SPILL)) isSpill = true;
  }

  const amountCol = map.amount;
  const line: ParsedLine = {
    side,
    gatewayCode,
    businessDate: map.business_date ? asDateISO(cellAt(ws, map.business_date, row)) : null,
    txnDatetime: map.txn_datetime ? asDatetimeISO(cellAt(ws, map.txn_datetime, row)) : null,
    externalRef: map.external_ref ? asString(cellAt(ws, map.external_ref, row)) : null,
    tenderCode: map.tender ? asString(cellAt(ws, map.tender, row)) : null,
    amount: amountCol ? asNumber(cellAt(ws, amountCol, row)) : null,
    status: map.status ? asString(cellAt(ws, map.status, row)) : null,
    billNo: map.bill_no ? asString(cellAt(ws, map.bill_no, row)) : null,
    raw,
  };
  return { line, hasError, isSpill };
}

/** Is there a real row present on this side? Keyed by a stable field, not the anchor. */
function present(line: ParsedLine, side: "POS" | "PG"): boolean {
  if (side === "POS") return line.billNo != null || line.amount != null;
  return line.externalRef != null || line.amount != null;
}

export function parseWorkbook(
  wb: WorkBook,
  layout: ReconLayout,
  gateways: GatewayLayout[],
): ParseResult {
  const results = wb.Sheets[layout.resultsSheet];
  if (!results) throw new Error(`Missing sheet '${layout.resultsSheet}'`);

  const cases: DraftCase[] = [];
  const stats: GatewayStat[] = [];
  const junk = { formulaErrors: 0, shopeeSpill: 0, zeroAmount: 0 };
  const end = lastRow(results);

  let outletName: string | null = null;

  for (const gw of gateways) {
    let rowsRead = 0;
    let rowsJunk = 0;
    let rowsKept = 0;
    let keptPos = 0;
    let keptPg = 0;
    let total = 0;
    let errorRows = 0;

    for (const side of ["POS", "PG"] as const) {
      const map = side === "POS" ? gw.pos : gw.pg;
      for (let r = layout.resultsDataRow; r <= end; r++) {
        const { line, hasError, isSpill } = readLine(results, side, gw.gatewayCode, map, r);
        if (!present(line, side) && !hasError) continue;

        rowsRead++;
        if (outletName == null && side === "POS") {
          outletName = map.outlet ? asString(cellAt(results, map.outlet, r)) : null;
        }

        // Junk filters (in order, each counted).
        if (hasError) {
          junk.formulaErrors++;
          errorRows++;
          rowsJunk++;
          continue;
        }
        if (isSpill) {
          junk.shopeeSpill++;
          rowsJunk++;
          continue;
        }
        if (line.amount == null || line.amount === 0) {
          junk.zeroAmount++;
          rowsJunk++;
          continue;
        }

        rowsKept++;
        if (side === "POS") keptPos++;
        else keptPg++;
        total += line.amount;

        // Matched (cross-tender) rows are handled via the Interrecon tab.
        if ((line.status ?? "").toUpperCase() === MATCHED_STATUS) continue;

        if (side === "POS") {
          cases.push({
            caseType: "BILL_NO_PAYMENT",
            gatewayCode: gw.gatewayCode,
            businessDate: line.businessDate,
            posAmount: line.amount,
            pgAmount: null,
            orSequence: null,
            tender: line.tenderCode,
            adjTender: null,
            lines: [line],
          });
        } else {
          cases.push({
            caseType: "PAYMENT_NO_BILL",
            gatewayCode: gw.gatewayCode,
            businessDate: line.businessDate,
            posAmount: null,
            pgAmount: line.amount,
            orSequence: null,
            tender: line.tenderCode,
            adjTender: null,
            lines: [line],
          });
        }
      }
    }

    stats.push({
      gatewayCode: gw.gatewayCode,
      rowsRead,
      rowsJunk,
      rowsKept,
      keptPos,
      keptPg,
      totalAmount: Math.round(total * 100) / 100,
      feedStatus: rowsRead === 0 ? "empty" : errorRows > 0 && rowsKept === 0 ? "error" : "ok",
    });
  }

  // Interrecon: matched cross-tender pairs -> VARIANCE cases.
  cases.push(...parseInterrecon(wb, layout));

  const fileBill = readChecksum(results, layout.checksumBillNoCell);
  const fileNoBill = readChecksum(results, layout.checksumNoBillCell);
  // C1/C2 count every kept POS/PG row (orphans + INTERRECON-matched alike).
  const parsedPos = stats.reduce((n, s) => n + s.keptPos, 0);
  const parsedPg = stats.reduce((n, s) => n + s.keptPg, 0);

  return {
    outletName,
    cases,
    stats,
    junk,
    checksum: {
      fileBillNoPayment: fileBill,
      filePaymentNoBill: fileNoBill,
      parsedBillNoPayment: parsedPos,
      parsedPaymentNoBill: parsedPg,
      reconciles:
        (fileBill == null || fileBill === parsedPos) &&
        (fileNoBill == null || fileNoBill === parsedPg),
    },
  };
}

function parseInterrecon(wb: WorkBook, layout: ReconLayout): DraftCase[] {
  const ws = wb.Sheets[layout.interreconSheet];
  if (!ws) return [];
  const end = lastRow(ws);
  const out: DraftCase[] = [];

  for (let r = layout.interreconDataRow; r <= end; r++) {
    const billNo = asString(cellAt(ws, "E", r)); // Bill No.
    const posAmount = asNumber(cellAt(ws, "G", r)); // Gross Sales
    const pgAmount = asNumber(cellAt(ws, "K", r)); // PG Amount
    if (!billNo && posAmount == null && pgAmount == null) continue;

    const businessDate = asDateISO(cellAt(ws, "B", r));
    const tender = asString(cellAt(ws, "D", r));
    const adjTender = asString(cellAt(ws, "J", r));
    const orSequence = asString(cellAt(ws, "L", r));

    const posLine: ParsedLine = {
      side: "POS", gatewayCode: "", businessDate, txnDatetime: null,
      externalRef: billNo, tenderCode: tender, amount: posAmount,
      status: "INTERRECON", billNo, raw: { source: "interrecon" },
    };
    const pgLine: ParsedLine = {
      side: "PG", gatewayCode: "", businessDate, txnDatetime: null,
      externalRef: orSequence, tenderCode: adjTender, amount: pgAmount,
      status: "INTERRECON", billNo, raw: { source: "interrecon", or_sequence: orSequence },
    };

    out.push({
      caseType: "VARIANCE",
      gatewayCode: "", // resolved from tender mapping at case-creation time
      businessDate,
      posAmount,
      pgAmount,
      orSequence,
      tender,
      adjTender,
      lines: [posLine, pgLine],
    });
  }
  return out;
}

function readChecksum(ws: WorkSheet, cell: string): number | null {
  const col = cell.replace(/\d/g, "");
  const row = Number(cell.replace(/\D/g, ""));
  return asNumber(cellAt(ws, col, row));
}
