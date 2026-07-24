import { describe, it, expect } from "vitest";
import { resolveOutlet } from "@/lib/recon/ingest";

const OUTLETS = [
  { id: "obj", code: "OBJ", zeoniq_name: "01-Bukit Jelutong" },
  { id: "ost", code: "OST", zeoniq_name: "04-Setapak" },
  { id: "zgd", code: "ZGD", zeoniq_name: "ZEN01-Zenders - Glo Damansara" },
];

describe("resolveOutlet (tolerant outlet matching)", () => {
  it("matches despite a trailing underscore in the file (04-Setapak_)", () => {
    expect(resolveOutlet("04-Setapak_", "Reconciliation_OST - 2026.07_W1W2.xlsx", OUTLETS)?.code).toBe("OST");
  });

  it("matches a clean Zeoniq name", () => {
    expect(resolveOutlet("01-Bukit Jelutong", "x.xlsx", OUTLETS)?.code).toBe("OBJ");
  });

  it("falls back to the numeric prefix", () => {
    expect(resolveOutlet("04 - Setapak (Kedai)", "x.xlsx", OUTLETS)?.code).toBe("OST");
  });

  it("falls back to the outlet code in the filename", () => {
    expect(resolveOutlet("something unrecognised", "Reconciliation_ZGD - 2026.07.xlsx", OUTLETS)?.code).toBe("ZGD");
  });

  it("returns null when nothing matches", () => {
    expect(resolveOutlet("Totally Unknown", "random.xlsx", OUTLETS)).toBeNull();
  });
});
