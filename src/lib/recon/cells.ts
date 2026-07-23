import type { CellObject, WorkSheet } from "xlsx";

/** Cell access + type coercion helpers for the recon parser. */

export function cellAt(ws: WorkSheet, col: string, row: number): CellObject | undefined {
  return ws[`${col}${row}`] as CellObject | undefined;
}

/** SheetJS marks formula-error cells with type 'e' (#VALUE!, #REF!, #N/A). */
export function isError(cell: CellObject | undefined): boolean {
  return cell?.t === "e";
}

export function asString(cell: CellObject | undefined): string | null {
  if (!cell || cell.t === "e" || cell.v == null) return null;
  const s = String(cell.v).trim();
  return s === "" ? null : s;
}

export function asNumber(cell: CellObject | undefined): number | null {
  if (!cell || cell.t === "e" || cell.v == null) return null;
  if (typeof cell.v === "number") return cell.v;
  const n = Number(String(cell.v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Excel serial (1900 date system) -> ISO datetime. 25569 = days 1899-12-30→epoch. */
export function serialToISO(serial: number | null): string | null {
  if (serial == null || !Number.isFinite(serial)) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function asDatetimeISO(cell: CellObject | undefined): string | null {
  if (!cell || cell.t === "e" || cell.v == null) return null;
  if (cell.v instanceof Date) return cell.v.toISOString();
  if (typeof cell.v === "number") return serialToISO(cell.v);
  return null;
}

export function asDateISO(cell: CellObject | undefined): string | null {
  const iso = asDatetimeISO(cell);
  return iso ? iso.slice(0, 10) : null;
}
