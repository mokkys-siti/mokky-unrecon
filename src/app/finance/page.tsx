import Link from "next/link";

export default function FinanceHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Finance desk</h1>
      <p className="mt-1 text-sm text-gray-600">
        Upload the fortnightly recon workbooks, review what the app extracted,
        then publish so outlets can answer their cases.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/finance/dashboard"
          className="rounded-xl border border-gray-200 bg-brand-white p-5 transition hover:border-brand-orange"
        >
          <h2 className="font-semibold text-gray-900">Outlet performance</h2>
          <p className="mt-1 text-sm text-gray-600">
            Response rate, awaiting cases, and outstanding exposure per outlet.
          </p>
        </Link>
        <Link
          href="/finance/upload"
          className="rounded-xl border border-gray-200 bg-brand-white p-5 transition hover:border-brand-orange"
        >
          <h2 className="font-semibold text-gray-900">Upload recon files</h2>
          <p className="mt-1 text-sm text-gray-600">
            Drag in one or more .xlsx files. The app parses each and stages a
            batch for review. Nothing is published automatically.
          </p>
        </Link>
        <Link
          href="/finance/batches"
          className="rounded-xl border border-gray-200 bg-brand-white p-5 transition hover:border-brand-orange"
        >
          <h2 className="font-semibold text-gray-900">Review batches</h2>
          <p className="mt-1 text-sm text-gray-600">
            See rows read, junk dropped, and cases per gateway. Confirm to
            publish, or investigate a broken feed.
          </p>
        </Link>
      </div>
    </div>
  );
}
