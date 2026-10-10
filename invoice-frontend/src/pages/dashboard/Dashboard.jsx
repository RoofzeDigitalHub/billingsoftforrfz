import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useBillingLocations } from "../../api/billingLocations";
import { getInvoices } from "../../api/invoices";
import { formatINR } from "../../utils/InvoiceCalculations";

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="mb-2 text-xs font-semibold text-slate-400 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold ${accent || "text-slate-900 dark:text-white"}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 dark:border dark:border-teal-500/30 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" /> PAID
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/60 dark:border dark:border-red-500/30 px-2.5 py-1 text-xs font-bold text-red-500 dark:text-red-300">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400" /> PENDING
    </span>
  );
}

function Dashboard() {
  const { locations: billingLocations } = useBillingLocations();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getInvoices()
      .then((data) => {
        if (!cancelled) setInvoices(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Could not load invoices.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const paidRevenue = invoices.filter((i) => i.payment_status === "PAID").reduce((sum, i) => sum + i.total_amount, 0);
  const pendingAmount = invoices
    .filter((i) => i.payment_status === "PENDING")
    .reduce((sum, i) => sum + i.total_amount, 0);
  const recent = [...invoices].sort((a, b) => b.created_at - a.created_at).slice(0, 6);
  const activeLocations = billingLocations.filter((l) => l.is_active).length;

  const locationName = (id) => billingLocations.find((l) => String(l.id) === String(id))?.name || "—";

  return (
    <AppLayout title="Dashboard" subtitle="Overview of Roofze's billing activity.">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {loadError} — make sure the backend is running (`npm run dev` in invoice-backend).
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoices" value={loading ? "…" : invoices.length} />
        <StatCard label="Paid Revenue" value={formatINR(paidRevenue)} accent="text-teal-700" />
        <StatCard label="Pending Amount" value={formatINR(pendingAmount)} accent="text-red-500" />
        <StatCard label="Active Locations" value={`${activeLocations} / ${billingLocations.length}`} />
      </div>

      <div className="mb-6">
        <Link
          to="/dashboard/invoices/create"
          className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-lime-400"
        >
          New Invoice
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Recent Invoices</h2>
          <Link to="/dashboard/invoices" className="text-xs font-semibold text-teal-700 hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400 dark:text-slate-500">Loading invoices…</div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-1 text-sm font-bold text-slate-900 dark:text-white">No invoices yet</div>
            <div className="mb-4 max-w-xs text-xs text-slate-400 dark:text-slate-500">
              Create your first invoice to see it here.
            </div>
            <Link
              to="/dashboard/invoices/create"
              className="rounded-xl bg-slate-900 dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs text-slate-400 dark:text-slate-400">
                  <th className="px-5 py-3 font-semibold dark:text-slate-300">Invoice #</th>
                  <th className="px-5 py-3 font-semibold dark:text-slate-300">Client</th>
                  <th className="px-5 py-3 font-semibold dark:text-slate-300">Location</th>
                  <th className="px-5 py-3 font-semibold dark:text-slate-300">Total</th>
                  <th className="px-5 py-3 font-semibold dark:text-slate-300">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-800/80 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900 dark:text-white font-mono">{inv.invoice_number}</span>
                        {inv.payment_status !== "PAID" && String(inv.invoice_number || "").startsWith("TMP-") && (
                          <span className="rounded bg-amber-100 dark:bg-amber-950/60 dark:border dark:border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            Temp
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-medium">{inv.client_name}</td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-300">{locationName(inv.billing_location_id)}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{formatINR(inv.total_amount)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.payment_status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/dashboard/invoices/${inv.id}`}
                        className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 hover:underline transition"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;
