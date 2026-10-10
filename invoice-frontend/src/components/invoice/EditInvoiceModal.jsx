import { useState } from "react";
import { INDIAN_STATES, PAYMENT_MODE_OPTIONS } from "../../data/invoiceFormOptions";
import { formatINR } from "../../utils/InvoiceCalculations";

export default function EditInvoiceModal({ invoice, onSave, onClose }) {
  const [clientName, setClientName] = useState(invoice.client_name || "");
  const [clientContact, setClientContact] = useState(invoice.client_contact || "");
  const [clientAddress, setClientAddress] = useState(invoice.client_address || "");
  const [clientState, setClientState] = useState(invoice.client_state || "");
  const [clientPan, setClientPan] = useState(invoice.client_pan || "");
  const [clientGstNumber, setClientGstNumber] = useState(invoice.client_gst_number || "");
  const [paymentMode, setPaymentMode] = useState(invoice.payment_mode || "");
  const [paymentReference, setPaymentReference] = useState(invoice.payment_reference || "");
  const [paymentDate, setPaymentDate] = useState(invoice.payment_date || "");
  const [terms, setTerms] = useState(invoice.terms || "");
  const [showBankDetails, setShowBankDetails] = useState(invoice.show_bank_details !== false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!clientName.trim()) {
      setError("Client name cannot be empty.");
      return;
    }
    if (!clientContact.trim()) {
      setError("Client contact cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSave({
        client_name: clientName.trim(),
        client_contact: clientContact.trim(),
        client_address: clientAddress.trim(),
        client_state: clientState,
        client_pan: clientPan.trim().toUpperCase(),
        client_gst_number: clientGstNumber.trim().toUpperCase(),
        payment_mode: paymentMode,
        payment_reference: paymentReference.trim(),
        payment_date: paymentDate || null,
        terms: terms.trim(),
        show_bank_details: showBankDetails,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save invoice changes.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "h-9 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 text-xs text-slate-800 dark:text-slate-100 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900";
  const labelClass = "mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Edit Invoice Details</h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-400">
              Update client information, contact, or terms. Pricing and sequence cannot be modified.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Locked Information Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
              <span>🔒 Locked Financial Details (Non-editable)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white/80 dark:bg-slate-700/80 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <span className="block text-[10px] text-slate-400">Invoice Number</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.invoice_number}</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-700/80 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40">
                <span className="block text-[10px] text-slate-400">Total Amount</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">{formatINR(invoice.total_amount)}</span>
              </div>
              <div className="bg-white/80 dark:bg-slate-700/80 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40 col-span-2 sm:col-span-1">
                <span className="block text-[10px] text-slate-400">Invoice Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.invoice_type || "DIRECT"}</span>
              </div>
            </div>
          </div>

          {/* Editable Client Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Client / Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={fieldClass}
                placeholder="Business Name"
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Contact Person / Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                className={fieldClass}
                placeholder="Contact Person : Phone"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Billing Address</label>
              <input
                type="text"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className={fieldClass}
                placeholder="Full Street Address"
              />
            </div>

            <div>
              <label className={labelClass}>State</label>
              <select
                value={clientState}
                onChange={(e) => setClientState(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select state…</option>
                {clientState && !INDIAN_STATES.includes(clientState) && (
                  <option value={clientState}>{clientState}</option>
                )}
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>PAN</label>
              <input
                type="text"
                maxLength={10}
                value={clientPan}
                onChange={(e) => setClientPan(e.target.value.toUpperCase())}
                className={`${fieldClass} uppercase`}
                placeholder="ABCDE1234F"
              />
            </div>

            <div>
              <label className={labelClass}>GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={clientGstNumber}
                onChange={(e) => setClientGstNumber(e.target.value.toUpperCase())}
                className={`${fieldClass} uppercase`}
                placeholder="27ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className={labelClass}>Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select Mode…</option>
                {PAYMENT_MODE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.label}>
                    {m.label}
                  </option>
                ))}
                <option value="Google Pay">Google Pay</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Payment Reference / Transaction ID</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Transaction ID / UTR / Cheque No"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Terms &amp; Conditions / Note</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900"
                placeholder="Invoice notes or payment terms"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBankDetails}
                  onChange={(e) => setShowBankDetails(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Show bank details on invoice</span>
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
