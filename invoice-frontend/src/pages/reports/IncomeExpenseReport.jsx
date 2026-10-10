import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import TransactionModal from "../../components/expenses/TransactionModal";
import { getIncomeExpenseReport } from "../../api/reports";
import { createExpense } from "../../api/expenses";
import { formatINR } from "../../utils/InvoiceCalculations";
import { IconPlus, IconCalendar, IconTrendingUp, IconChartBar } from "../../components/icons/Icons";

function IncomeExpenseReport() {
  const [viewBy, setViewBy] = useState("month"); // 'month' | 'year' | 'date'
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState("");

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getIncomeExpenseReport({
        view_by: viewBy,
        year: selectedYear || undefined,
        month: selectedMonth || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setReport(res);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load income & expense report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [viewBy, selectedYear, selectedMonth, startDate, endDate]);

  const handleAddTransaction = async (formData) => {
    await createExpense(formData);
    await loadReport();
  };

  const handleOpenAddModal = (dateStr) => {
    setPrefillDate(dateStr || new Date().toISOString().slice(0, 10));
    setModalOpen(true);
  };

  const maxPeriodAmount = Math.max(
    ...(report?.grouped_data || []).map((r) => Math.max(r.income || 0, r.expense || 0)),
    1000
  );

  return (
    <AppLayout
      title="Income vs Expense Report (P&L)"
      subtitle="Complete date-wise breakdown of revenue, expenses, salaries, and net profit."
      breadcrumbs={["Dashboard", "Reports", "Income & Expense"]}
    >
      {/* Top Filter and Actions Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between print:hidden">
        {/* View Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">View By:</span>
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setViewBy("month")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewBy === "month"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setViewBy("year")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewBy === "year"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              By Year
            </button>
            <button
              onClick={() => setViewBy("date")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewBy === "date"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Date-wise
            </button>
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="">All Years</option>
            <option value="2026">Year 2026</option>
            <option value="2025">Year 2025</option>
          </select>

          {/* Month selector if month mode */}
          {viewBy === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              title="Specific month filter"
            />
          )}

          {/* Custom Date Range if date mode */}
          {viewBy === "date" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="From"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="To"
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          )}

          {(selectedMonth || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedMonth("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <IconPlus className="h-4 w-4" />
            Add Expense / Income
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Income (Credit)</span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
              INFLOW
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(report?.overview?.total_income || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total revenue received</div>
        </div>

        {/* Total Expense */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expense (Debit)</span>
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
              OUTFLOW
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(report?.overview?.total_expense || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total expenses, salaries, rent &amp; loans</div>
        </div>

        {/* Net Profit / Cashflow */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Cashflow (P&amp;L)</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                (report?.overview?.net_profit || 0) >= 0
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {(report?.overview?.net_profit || 0) >= 0 ? "PROFIT" : "DEFICIT"}
            </span>
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              (report?.overview?.net_profit || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-500"
            }`}
          >
            {formatINR(report?.overview?.net_profit || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Income minus total expenditure</div>
        </div>

        {/* Profit Margin / Count */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transactions Count</span>
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
              ACTIVITY
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {report?.overview?.transaction_count || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Recorded transactions in period</div>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Category-Wise Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(report?.category_breakdown || []).map((cat) => {
            const isCredit = (cat.type_name || "").toLowerCase() === "credit";
            return (
              <div
                key={cat.category_id}
                className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.category_name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      isCredit
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {cat.type_name}
                  </span>
                </div>
                <div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatINR(cat.total_amount)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{cat.transaction_count} transaction(s)</span>
                  <span className="font-semibold text-slate-300">{cat.percentage}% share</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isCredit ? "bg-emerald-500" : "bg-rose-500"}`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date-wise / Monthly Breakdown Table with Visual Progress */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {viewBy === "month"
                ? "Monthly Income vs Expense Summary"
                : viewBy === "year"
                ? "Yearly Financial Summary"
                : "Date-wise Income vs Expense"}
            </h3>
            <p className="text-[11px] text-slate-400">
              Compare how much income was generated vs expense incurred in each period
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5 text-right">Income (Credit)</th>
                <th className="px-5 py-3.5 text-right">Expense (Debit)</th>
                <th className="px-5 py-3.5 text-right">Net Balance</th>
                <th className="px-5 py-3.5 w-1/3 min-w-[200px]">Visual Comparison (Income vs Expense)</th>
                <th className="px-5 py-3.5 text-center">Txns</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading income and expense report…
                  </td>
                </tr>
              ) : !report?.grouped_data || report.grouped_data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No transactions found for this period.
                  </td>
                </tr>
              ) : (
                report.grouped_data.map((row) => {
                  const incomePct = maxPeriodAmount > 0 ? (row.income / maxPeriodAmount) * 100 : 0;
                  const expensePct = maxPeriodAmount > 0 ? (row.expense / maxPeriodAmount) * 100 : 0;
                  return (
                    <tr key={row.period_key} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="whitespace-nowrap px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {row.period_label || row.period_key}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        + {formatINR(row.income)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-sm">
                        − {formatINR(row.expense)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-extrabold text-sm ${
                          row.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                        }`}
                      >
                        {formatINR(row.net)}
                      </td>
                      {/* Visual Bars Comparison */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] w-6 text-slate-400 font-mono">INC</span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(incomePct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] w-6 text-slate-400 font-mono">EXP</span>
                            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-rose-500"
                                style={{ width: `${Math.min(expensePct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-center text-slate-400">
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {row.transaction_count}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(row.period_key + "-01")}
                          className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          + Add Record
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Transactions Section for this Filter */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Individual Transaction Entries ({report?.transactions?.length || 0})
          </h3>
          <p className="text-[11px] text-slate-400">List of entries included in this financial report</p>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Vendor / Person</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {!report?.transactions || report.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No transactions to display.
                  </td>
                </tr>
              ) : (
                report.transactions.map((t) => {
                  const isCredit = (t.type_name || "").toLowerCase() === "credit";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {t.expense_date_formatted || t.expense_date}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {t.vendor_person_name}
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {t.category_name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                        {t.description || "—"}
                        {t.invoice_number && (
                          <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-lime-400">
                            Inv #{t.invoice_number}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isCredit
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {t.type_name}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3 text-right font-bold ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isCredit ? `+ ${formatINR(t.amount)}` : `− ${formatINR(t.amount)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddTransaction}
        initialData={prefillDate ? { expense_date: prefillDate } : null}
      />
    </AppLayout>
  );
}

export default IncomeExpenseReport;
