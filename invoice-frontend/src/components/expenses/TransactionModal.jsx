import { useState, useEffect } from "react";
import { getExpenseTypes, getExpenseCategories, createExpenseCategory } from "../../api/expenses";

function TransactionModal({ isOpen, onClose, onSave, initialData = null }) {
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [person, setPerson] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New category inline creation
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([getExpenseTypes(), getExpenseCategories()])
      .then(([typeList, catList]) => {
        if (cancelled) return;
        setTypes(typeList);
        setCategories(catList);

        if (initialData) {
          setDate(initialData.expense_date || new Date().toISOString().slice(0, 10));
          setTypeId(String(initialData.type_id || ""));
          setCategoryId(String(initialData.category_id || ""));
          setAmount(String(initialData.amount || ""));
          setPerson(initialData.vendor_person_name || "");
          setDescription(initialData.description || "");
        } else {
          setDate(new Date().toISOString().slice(0, 10));
          // Default to Debit if available
          const defaultDebit = typeList.find((t) => t.name.toLowerCase() === "debit");
          const tid = defaultDebit ? String(defaultDebit.id) : typeList[0] ? String(typeList[0].id) : "";
          setTypeId(tid);
          setCategoryId("");
          setAmount("");
          setPerson("");
          setDescription("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError("Failed to load types and categories: " + err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Filter categories by selected type if applicable, or show all
  const filteredCategories = categories.filter((c) => {
    if (!typeId) return true;
    if (!c.type_id) return true;
    return String(c.type_id) === String(typeId);
  });

  const handleTypeChange = (e) => {
    const newTypeId = e.target.value;
    setTypeId(newTypeId);
    // If current selected category doesn't belong to this type, clear category
    const cat = categories.find((c) => String(c.id) === String(categoryId));
    if (cat && cat.type_id && String(cat.type_id) !== String(newTypeId)) {
      setCategoryId("");
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === "__ADD_NEW__") {
      setShowNewCatInput(true);
      return;
    }
    setCategoryId(val);
    // Auto-select type if category is bound to a type
    const cat = categories.find((c) => String(c.id) === String(val));
    if (cat && cat.type_id) {
      setTypeId(String(cat.type_id));
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const created = await createExpenseCategory({
        name: newCatName.trim(),
        type_id: typeId ? parseInt(typeId, 10) : null,
      });
      setCategories((prev) => [...prev, created]);
      setCategoryId(String(created.id));
      setShowNewCatInput(false);
      setNewCatName("");
    } catch (err) {
      setError(err.message || "Failed to create category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!date) {
      setError("Please select a date.");
      return;
    }
    if (!typeId) {
      setError("Please select transaction type.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!person.trim()) {
      setError("Please enter vendor / person name.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        expense_date: date,
        type_id: parseInt(typeId, 10),
        category_id: parseInt(categoryId, 10),
        amount: parseFloat(amount),
        vendor_person_name: person.trim(),
        description: description.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#11131a] border border-slate-800 p-6 sm:p-7 shadow-2xl text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {initialData ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs font-medium text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Row 1: Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Type <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={typeId}
                onChange={handleTypeChange}
                className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Category <span className="text-rose-500">*</span>
                </label>
                {!showNewCatInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(true)}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    + New
                  </button>
                )}
              </div>

              {showNewCatInput ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New category..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="rounded-xl bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(false)}
                    className="rounded-xl bg-slate-800 px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={categoryId}
                  onChange={handleCategoryChange}
                  className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                >
                  <option value="">Select category</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.type_name ? `(${c.type_name})` : ""}
                    </option>
                  ))}
                  <option value="__ADD_NEW__">+ Add Custom Category...</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 3: Vendor / Person Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Vendor / Person Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bank, Employee name"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-[#1a1d27] border border-slate-700/60 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingLookups}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionModal;
