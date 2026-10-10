import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { getClientLedgerReport } from "../../api/reports";
import { formatINR } from "../../utils/InvoiceCalculations";
import { IconSearch, IconUsers, IconInvoice, IconCalendar } from "../../components/icons/Icons";

function ClientLedgerReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClientId = searchParams.get("client_id") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");

  const [activeTab, setActiveTab] = useState("ledger"); // 'ledger' | 'invoices'

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getClientLedgerReport({
        client_id: selectedClientId || undefined,
        search: search || undefined,
      });
      setData(res);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load client ledger report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedClientId, search]);

  const handleSelectClient = (id) => {
    if (id) {
      setSearchParams({ client_id: id });
    } else {
      setSearchParams({});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Client Ledger & Invoice Summary"
      subtitle="Track customer balances, statement of accounts, and payment settlements."
      breadcrumbs={["Dashboard", "Reports", "Client Ledger"]}
    >
      {/* Top Filter & Client Selector */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {selectedClientId ? (
            <button
              onClick={() => handleSelectClient("")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              ← All Clients Overview
            </button>
          ) : (
            <div className="relative min-w-[240px]">
              <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedClientId && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition"
            >
              🖨️ Print Statement
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* MODE 1: ALL CLIENTS OVERVIEW */}
      {!selectedClientId && (
        <div>
          {/* KPI Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoiced Amount</div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {formatINR(data?.summary?.total_invoiced || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Total billings across clients</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Amount Received</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(data?.summary?.total_paid || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Settled and collected revenue</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding Balance Due</div>
              <div
                className={`mt-2 text-2xl font-bold ${
                  (data?.summary?.balance_due || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-500"
                }`}
              >
                {formatINR(data?.summary?.balance_due || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Pending customer receivables</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoices Raised</div>
              <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.summary?.total_invoices || 0}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Cumulative invoice count</div>
            </div>
          </div>

          {/* Clients Summary Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clients Account Balances</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Client Code</th>
                    <th className="px-5 py-3.5">Business Name</th>
                    <th className="px-5 py-3.5">Contact Person</th>
                    <th className="px-5 py-3.5 text-center">Invoices</th>
                    <th className="px-5 py-3.5 text-right">Invoiced</th>
                    <th className="px-5 py-3.5 text-right">Paid</th>
                    <th className="px-5 py-3.5 text-right">Balance Due</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        Loading client ledger summary…
                      </td>
                    </tr>
                  ) : !data?.data || data.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        No clients found.
                      </td>
                    </tr>
                  ) : (
                    data.data.map((c) => (
                      <tr key={c.client_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-slate-500">
                          {c.client_code || "—"}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {c.business_name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                          <div>{c.contact_person || "—"}</div>
                          {c.phone && <div className="text-[10px] text-slate-400">{c.phone}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {c.total_invoices} total ({c.paid_invoices} paid)
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-slate-900 dark:text-slate-100">
                          {formatINR(c.total_invoiced)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatINR(c.total_paid)}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-bold ${
                            c.balance_due > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                          }`}
                        >
                          {formatINR(c.balance_due)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleSelectClient(c.client_id)}
                            className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                          >
                            View Ledger →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: SPECIFIC CLIENT LEDGER STATEMENT & INVOICES */}
      {selectedClientId && data?.client && (
        <div className="space-y-6">
          {/* Client Profile Header Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-lime-300 px-2 py-0.5 text-[11px] font-extrabold text-slate-950">
                    {data.client.client_code || "CLIENT"}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data.client.business_name}</h2>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {data.client.contact_person && <div>Contact: <span className="font-medium text-slate-700 dark:text-slate-200">{data.client.contact_person}</span></div>}
                  {data.client.phone && <div>Phone: <span className="font-medium text-slate-700 dark:text-slate-200">{data.client.phone}</span></div>}
                  {data.client.email && <div>Email: <span className="font-medium text-slate-700 dark:text-slate-200">{data.client.email}</span></div>}
                  {data.client.gstin && <div>GSTIN: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{data.client.gstin}</span></div>}
                  {data.client.pan && <div>PAN: <span className="font-mono font-medium text-slate-700 dark:text-slate-200">{data.client.pan}</span></div>}
                </div>
                {data.client.billing_address && (
                  <div className="mt-2 text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                    {data.client.billing_address}
                  </div>
                )}
              </div>

              {/* Outstanding balance badge */}
              <div className="flex flex-col md:items-end justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-700/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Receivable Balance</span>
                <span
                  className={`text-2xl font-extrabold ${
                    (data.summary?.balance_due || 0) > 0 ? "text-rose-500" : "text-emerald-500"
                  }`}
                >
                  {formatINR(data.summary?.balance_due || 0)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {(data?.summary?.balance_due || 0) > 0 ? "Payment pending from client" : "All invoices settled in full"}
                </span>
              </div>
            </div>
          </div>

          {/* Client KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoiced</div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {formatINR(data?.summary?.total_invoiced || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Across {data?.summary?.total_invoices || 0} invoice(s)</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Collected</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(data?.summary?.total_paid || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{data?.summary?.paid_invoices || 0} invoice(s) settled</div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoices Breakdown</div>
              <div className="mt-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.summary?.paid_invoices || 0} Paid / {data?.summary?.pending_invoices || 0} Pending
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Invoice payment status</div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 print:hidden">
            <button
              onClick={() => setActiveTab("ledger")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                activeTab === "ledger"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Statement of Account (Ledger)
            </button>
            <button
              onClick={() => setActiveTab("invoices")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                activeTab === "invoices"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Invoices Summary ({data.invoices?.length || 0})
            </button>
          </div>

          {/* TAB 1: STATEMENT OF ACCOUNT (LEDGER) */}
          {activeTab === "ledger" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ledger Running Balance</h3>
                  <p className="text-[11px] text-slate-400">Chronological history of debits (billings) and credits (receipts)</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Doc / Ref No.</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5 text-right">Debit (Billed +)</th>
                      <th className="px-5 py-3.5 text-right">Credit (Paid -)</th>
                      <th className="px-5 py-3.5 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {!data.ledger || data.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          No transactions or invoices recorded for this client.
                        </td>
                      </tr>
                    ) : (
                      data.ledger.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                            {row.date}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                            {row.doc_number || "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                row.type === "INVOICE"
                                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                            {row.description}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-900 dark:text-slate-100">
                            {row.debit > 0 ? formatINR(row.debit) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {row.credit > 0 ? formatINR(row.credit) : "—"}
                          </td>
                          <td
                            className={`whitespace-nowrap px-5 py-3.5 text-right font-bold text-sm ${
                              row.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-500"
                            }`}
                          >
                            {formatINR(row.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES SUMMARY */}
          {activeTab === "invoices" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invoices Issued to Client</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5 text-right">Subtotal</th>
                      <th className="px-5 py-3.5 text-right">GST</th>
                      <th className="px-5 py-3.5 text-right">Total Amount</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5">Payment Details</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                    {!data.invoices || data.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                          No invoices found for this client.
                        </td>
                      </tr>
                    ) : (
                      data.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {inv.invoice_number}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                            {inv.invoice_date}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5">
                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                              {inv.invoice_type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            {formatINR(inv.subtotal_amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-600 dark:text-slate-300">
                            {inv.gst_amount > 0 ? formatINR(inv.gst_amount) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                            {formatINR(inv.total_amount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-center">
                            {inv.payment_status === "PAID" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> PAID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> PENDING
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            {inv.payment_status === "PAID" ? (
                              <div>
                                <div>{inv.payment_date} ({inv.payment_mode || "Bank"})</div>
                                {inv.payment_reference && (
                                  <div className="text-[10px] text-slate-400 font-mono">Ref: {inv.payment_reference}</div>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right">
                            <Link
                              to={`/dashboard/invoices/${inv.id}`}
                              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default ClientLedgerReport;
