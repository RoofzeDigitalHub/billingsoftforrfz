import { useEffect, useRef, useState } from "react";

import { PAYMENT_MODE_OPTIONS } from "../../data/invoiceFormOptions";

const todayISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const inputClass = (hasError) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-300 focus:border-teal-500 focus:ring-teal-100"
  }`;

/**
 * Popup shown when an invoice is marked as Paid.
 * Allows entering Payment Mode, Ref ID, Payment Date, Total Amount, and Payment Screenshot.
 * Generates the official sequential invoice number upon submission.
 */
function MarkPaidModal({ open, invoiceNumber, totalAmount, submitting, serverError, onSubmit, onClose }) {
  const [form, setForm] = useState({
    payment_mode: "",
    payment_reference: "",
    payment_date: todayISO(),
    amount_paid: "",
    payment_screenshot: "",
  });
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [screenshotName, setScreenshotName] = useState("");
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Fresh form every time the popup opens; amount defaults to the invoice total.
  useEffect(() => {
    if (!open) return;
    setForm({
      payment_mode: "",
      payment_reference: "",
      payment_date: todayISO(),
      amount_paid: totalAmount ? String(totalAmount) : "",
      payment_screenshot: "",
    });
    setScreenshotPreview("");
    setScreenshotName("");
    setErrors({});
  }, [open, totalAmount]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, payment_screenshot: "Please select an image file (PNG, JPG, WEBP)." }));
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, payment_screenshot: "Image size must be under 15MB." }));
      return;
    }

    setScreenshotName(file.name);
    setErrors((prev) => ({ ...prev, payment_screenshot: "" }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setScreenshotPreview(dataUrl);
      setField("payment_screenshot", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotPreview("");
    setScreenshotName("");
    setField("payment_screenshot", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.payment_mode) e.payment_mode = "Payment Mode is required.";
    if (!form.payment_reference.trim()) e.payment_reference = "Reference ID is required.";
    if (!form.payment_date) e.payment_date = "Payment Date is required.";
    const amt = Number(form.amount_paid);
    if (form.amount_paid === "") e.amount_paid = "Total Payment is required.";
    else if (!Number.isFinite(amt) || amt <= 0) e.amount_paid = "Enter an amount greater than 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (submitting || !validate()) return;
    onSubmit({
      payment_mode: form.payment_mode,
      payment_reference: form.payment_reference.trim(),
      payment_date: form.payment_date,
      amount_paid: Number(form.amount_paid),
      payment_screenshot: form.payment_screenshot || null,
    });
  };

  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
  const errorText = (name) =>
    errors[name] ? <p className="mt-1 text-xs font-medium text-red-500">{errors[name]}</p> : null;

  const isTempNumber = invoiceNumber && invoiceNumber.startsWith("TMP-");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-paid-title"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 id="mark-paid-title" className="text-lg font-bold text-slate-900">
              Mark as Paid &amp; Generate Invoice No.
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enter payment confirmation details{invoiceNumber ? ` for ${invoiceNumber}` : ""}.
          </p>
        </div>

        {/* Notice about invoice number generation */}
        {isTempNumber && (
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-800">
            <div className="flex items-start gap-2">
              <span className="font-bold text-teal-600">⚡ Invoice Number:</span>
              <div>
                This invoice currently has temporary number <strong>{invoiceNumber}</strong>. Upon confirming payment,
                the official sequential invoice number will be generated automatically.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="pay-mode" className={labelClass}>
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <select
              id="pay-mode"
              value={form.payment_mode}
              onChange={(e) => setField("payment_mode", e.target.value)}
              className={inputClass(errors.payment_mode)}
            >
              <option value="">Select payment mode</option>
              {PAYMENT_MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            {errorText("payment_mode")}
          </div>

          <div>
            <label htmlFor="pay-ref" className={labelClass}>
              Reference ID / Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              id="pay-ref"
              type="text"
              maxLength={100}
              value={form.payment_reference}
              onChange={(e) => setField("payment_reference", e.target.value)}
              placeholder="e.g. UTR / IMPS / UPI ref / cheque number"
              className={inputClass(errors.payment_reference)}
            />
            {errorText("payment_reference")}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-date" className={labelClass}>
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                id="pay-date"
                type="date"
                value={form.payment_date}
                onChange={(e) => setField("payment_date", e.target.value)}
                className={inputClass(errors.payment_date)}
              />
              {errorText("payment_date")}
            </div>

            <div>
              <label htmlFor="pay-amount" className={labelClass}>
                Total Payment (₹) <span className="text-red-500">*</span>
              </label>
              <input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amount_paid}
                onChange={(e) => setField("amount_paid", e.target.value)}
                placeholder="0.00"
                className={inputClass(errors.amount_paid)}
              />
              {errorText("amount_paid")}
            </div>
          </div>

          {/* Payment Screenshot Upload */}
          <div>
            <label className={labelClass}>
              Payment Screenshot / Receipt Proof
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="pay-screenshot-file"
            />

            {!screenshotPreview ? (
              <label
                htmlFor="pay-screenshot-file"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-4 text-center cursor-pointer transition hover:border-teal-500 hover:bg-slate-50"
              >
                <svg
                  className="h-8 w-8 text-slate-400 mb-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-semibold text-teal-700">
                  Click to upload payment screenshot
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG, JPEG or WEBP (Max 15MB)
                </span>
              </label>
            ) : (
              <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center gap-3">
                <img
                  src={screenshotPreview}
                  alt="Payment screenshot preview"
                  className="h-16 w-16 object-cover rounded-lg border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-semibold text-slate-800 truncate">{screenshotName || "Payment Screenshot"}</div>
                  <div className="text-[11px] text-teal-600 font-medium">Ready to upload</div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            )}
            {errorText("payment_screenshot")}
          </div>
        </div>

        {serverError && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {serverError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
          >
            {submitting ? "Processing…" : "Confirm Payment & Generate Invoice No."}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MarkPaidModal;

