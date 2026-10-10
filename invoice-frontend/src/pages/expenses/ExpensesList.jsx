import { useState, useEffect, useMemo } from "react";
import AppLayout from "../../components/layout/AppLayout";
import TransactionModal from "../../components/expenses/TransactionModal";
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseCategories, getExpenseTypes } from "../../api/expenses";
import { formatINR } from "../../utils/InvoiceCalculations";
import { IconSearch, IconPlus, IconTrash, IconCalendar } from "../../components/icons/Icons";

function CategoryBadge({ name }) {
  const n = (name || "").toLowerCase();
  let bg = "bg-slate-700/50 text-slate-200 border-slate-600/50";

  if (n === "income") bg = "bg-emerald-950/60 text-emerald-300 border-emerald-500/30";
  else if (n === "expense") bg = "bg-amber-950/60 text-amber-300 border-amber-500/30";
  else if (n === "salary") bg = "bg-indigo-950/60 text-indigo-300 border-indigo-500/30";
  else if (n === "loan") bg = "bg-rose-950/60 text-rose-300 border-rose-500/30";

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${bg}`}>
      {name}
    </span>
  );
}

function TypeBadge({ type }) {
  const isCredit = (type || "").toLowerCase() === "credit";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        isCredit
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isCredit ? "bg-emerald-400" : "bg-rose-400"}`} />
      {type}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const s = String(dateStr).slice(0, 10);
    const d = new Date(s + "T00:00:00");
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function ExpensesList() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_credit: 0, total_debit: 0, net_balance: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [monthFilter, setMonthFilter] = useState(""); // YYYY-MM
  const [yearFilter, setYearFilter] = useState(""); // YYYY

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load types & categories
  useEffect(() => {
    getExpenseCategories().then(setCategories).catch(console.error);
    getExpenseTypes().then(setTypes).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getExpenses({
        search,
        type_id: selectedType || undefined,
        category_id: selectedCategory || undefined,
        month: monthFilter || undefined,
        year: yearFilter || undefined,
        limit: 1000,
      });
      setTransactions(res.data || []);
      setSummary(res.summary || { total_credit: 0, total_debit: 0, net_balance: 0, count: 0 });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedType, selectedCategory, monthFilter, yearFilter]);

  const handleSaveTransaction = async (formData) => {
    if (editingItem) {
      await updateExpense(editingItem.id, formData);
    } else {
      await createExpense(formData);
    }
    await loadData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteId);
      setDeleteId(null);
      await loadData();
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout
      title="Expenses & Transactions"
      subtitle="Complete ledger of company expenses, salaries, loans, and revenue."
      breadcrumbs={["Dashboard", "Expenses & Transactions"]}
    >
      {/* KPI Overview Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Income (Credit)</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(summary.total_credit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Received revenue &amp; credits</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Expense (Debit)</div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(summary.total_debit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Bills, salaries, rent &amp; repayments</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Balance</div>
          <div
            className={`mt-2 text-2xl font-bold ${
              summary.net_balance >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-500"
            }`}
          >
            {formatINR(summary.net_balance)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Income minus total expenses</div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Records</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.count || transactions.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Filtered transaction entries</div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor, person, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-10 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
            title="Filter by Month"
          />

          {(search || selectedType || selectedCategory || monthFilter || yearFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedType("");
                setSelectedCategory("");
                setMonthFilter("");
                setYearFilter("");
              }}
              className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Add Transaction Button */}
        <div>
          <button
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
          >
            <IconPlus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Vendor / Person</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading transactions…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((item) => {
                  const isCredit = (item.type_name || "").toLowerCase() === "credit";
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                        {formatDate(item.expense_date)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {item.vendor_person_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <CategoryBadge name={item.category_name} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {item.description || "—"}
                        {item.invoice_number && (
                          <span className="ml-2 inline-flex items-center rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-lime-400">
                            Inv #{item.invoice_number}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <TypeBadge type={item.type_name} />
                      </td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-bold text-sm ${
                          isCredit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isCredit ? `+ ${formatINR(item.amount)}` : `− ${formatINR(item.amount)}`}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setModalOpen(true);
                            }}
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            title="Delete transaction"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingItem}
      />

      {/* Confirm Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Transaction</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this record? This action will permanently remove it from your expense ledger.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteId(null)}
                className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default ExpensesList;
