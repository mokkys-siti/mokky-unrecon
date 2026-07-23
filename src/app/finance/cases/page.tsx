import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { CasesTable, type CaseRow } from "./cases-table";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "responded", label: "To review" },
  { key: "open", label: "Awaiting outlet" },
  { key: "system", label: "System (hidden)" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

export default async function FinanceCases({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "responded" } = await searchParams;
  const supabase = await createClient();
  const session = await getSession();
  const canBulk = session?.appRole === "admin" || session?.appRole === "finance_manager";

  let q = supabase
    .from("unrecon_cases")
    .select(
      "id, gateway_code, business_date, case_type, classification, status, pos_amount, pg_amount, variance, outlet_visible, outlets(code), reason_codes(label), case_lines(side, external_ref)",
    )
    .is("deleted_at", null)
    .order("business_date", { ascending: true })
    .limit(500);

  if (view === "responded") q = q.eq("status", "outlet_responded");
  else if (view === "open") q = q.in("status", ["open", "awaiting_outlet"]);
  else if (view === "system") q = q.eq("classification", "SYSTEM");
  else if (view === "closed") q = q.in("status", ["closed", "auto_closed"]);

  const { data } = await q;
  const cases = (data ?? []) as unknown as CaseRow[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Cases</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/finance/cases?view=${v.key}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              v.key === view
                ? "bg-brand-orange text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-sm text-gray-500">{cases.length} case(s)</p>

      <div className="mt-3">
        <CasesTable cases={cases} canBulk={!!canBulk} />
      </div>
    </div>
  );
}
