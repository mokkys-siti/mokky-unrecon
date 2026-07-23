import Link from "next/link";

export default function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
      <p className="mt-1 text-sm text-gray-600">
        Policy lives in the database, not in code. Changes here take effect
        immediately and survive redeploys.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/reason-codes"
          className="rounded-xl border border-gray-200 bg-brand-white p-5 transition hover:border-brand-orange"
        >
          <h2 className="font-semibold text-gray-900">Reason codes</h2>
          <p className="mt-1 text-sm text-gray-600">
            The controlled list outlets pick from when answering a case.
          </p>
        </Link>
        <Link
          href="/admin/classification-rules"
          className="rounded-xl border border-gray-200 bg-brand-white p-5 transition hover:border-brand-orange"
        >
          <h2 className="font-semibold text-gray-900">Classification rules</h2>
          <p className="mt-1 text-sm text-gray-600">
            How incoming cases are classified, by priority order.
          </p>
        </Link>
      </div>
    </div>
  );
}
