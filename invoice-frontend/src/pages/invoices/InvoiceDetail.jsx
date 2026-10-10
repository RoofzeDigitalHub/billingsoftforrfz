import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AppLayout from "../../components/layout/AppLayout";
import InvoicePreview from "../../components/invoice/InvoicePreview";
import MarkPaidModal from "../../components/invoice/MarkPaidModal";
import EditInvoiceModal from "../../components/invoice/EditInvoiceModal";
import { useBillingLocations } from "../../api/billingLocations";
import { getInvoice, updateInvoiceStatus, updateInvoiceDetails } from "../../api/invoices";
import { formatINR } from "../../utils/InvoiceCalculations";

const getFullImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  const origin = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  return `${origin}${path}`;
};

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalError, setModalError] = useState("");
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState(null);
  const { locations: billingLocations } = useBillingLocations();

  const handleSaveDetails = async (details) => {
    setActionError("");
    setSuccessMsg("");
    const updated = await updateInvoiceDetails(invoice.id, details);
    setInvoice(updated);
    setSuccessMsg("Invoice details updated successfully.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getInvoice(id)
      .then((data) => {
        if (!cancelled) setInvoice(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Could not load this invoice.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Invoice">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading invoice…
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout title="Invoice not found">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="mb-4 text-sm text-slate-500">{loadError || "This invoice may have been removed."}</p>
          <Link
            to="/dashboard/invoices"
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Back to invoices
          </Link>
        </div>
      </AppLayout>
    );
  }

  const location = billingLocations.find((loc) => String(loc.id) === String(invoice.billing_location_id));
  const isPaid = invoice.payment_status === "PAID";
  const isTemp = !isPaid && String(invoice.invoice_number || "").startsWith("TMP-");

  // Paid -> Pending happens straight away; Pending -> Paid opens the popup first.
  const handleStatusClick = async () => {
    if (updating) return;
    if (!isPaid) {
      setModalError("");
      setShowPaidModal(true);
      return;
    }
    setUpdating(true);
    setActionError("");
    setSuccessMsg("");
    try {
      const updated = await updateInvoiceStatus(invoice.id, "PENDING");
      setInvoice(updated);
      setSuccessMsg("Invoice reverted to Pending.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setActionError(err.message || "Could not update the status.");
    } finally {
      setUpdating(false);
    }
  };

  const confirmPaid = async (details) => {
    setUpdating(true);
    setModalError("");
    setActionError("");
    try {
      const updated = await updateInvoiceStatus(invoice.id, "PAID", details);
      setInvoice(updated);
      setShowPaidModal(false);
      setSuccessMsg(`Payment confirmed! Official Invoice Number: ${updated.invoice_number} generated.`);
      setTimeout(() => setSuccessMsg(""), 6000);
    } catch (err) {
      setModalError(err.message || "Could not mark this invoice as paid.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppLayout title={invoice.invoice_number} subtitle="Review, update status, or print this invoice.">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/dashboard/invoices")}
            className="text-left text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← Back to invoices
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {!isPaid ? (
              <button
                onClick={handleStatusClick}
                disabled={updating}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark as Paid &amp; Generate Invoice No.
              </button>
            ) : (
              <button
                onClick={handleStatusClick}
                disabled={updating}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Revert to Pending
              </button>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-xs flex items-center gap-1.5"
            >
              ✎ Edit Details
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Temporary number banner */}
        {isTemp && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 print:hidden flex items-start gap-3">
            <span className="text-base">⏳</span>
            <div>
              <p className="font-bold text-amber-950">Unpaid Invoice (Temporary No: {invoice.invoice_number})</p>
              <p className="mt-0.5 text-amber-800">
                This invoice currently has a random temporary number. Once you click{" "}
                <strong>&quot;Mark as Paid &amp; Generate Invoice No.&quot;</strong> and enter payment details (with reference ID,
                amount, date, and screenshot), the official sequential invoice number will be generated and assigned.
              </p>
            </div>
          </div>
        )}

        {/* Success toast / banner */}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 print:hidden">
            ✅ {successMsg}
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 print:hidden">
            {actionError}
          </div>
        )}

        {/* Payment Confirmation Card if Paid */}
        {isPaid && (
          <div className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 print:hidden">
            <div className="flex items-center justify-between border-b border-teal-100/80 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">Payment Information</h3>
              </div>
              <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white">PAID</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <div>
                <span className="block text-[11px] text-slate-500">Payment Mode</span>
                <span className="font-semibold text-slate-800">{invoice.payment_mode || "—"}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500">Reference ID</span>
                <span className="font-semibold text-slate-800 truncate block" title={invoice.payment_reference}>
                  {invoice.payment_reference || "—"}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500">Payment Date</span>
                <span className="font-semibold text-slate-800">{invoice.payment_date || "—"}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-500">Amount Received</span>
                <span className="font-bold text-teal-700">{formatINR(invoice.amount_paid || invoice.total_amount)}</span>
              </div>
            </div>

            {invoice.payment_screenshot && (
              <div className="mt-4 pt-3 border-t border-teal-100/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getFullImageUrl(invoice.payment_screenshot)}
                    alt="Payment proof thumbnail"
                    className="h-12 w-12 rounded-lg border border-teal-200 object-cover cursor-pointer hover:opacity-90"
                    onClick={() => setViewScreenshotUrl(getFullImageUrl(invoice.payment_screenshot))}
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-800">Payment Screenshot</span>
                    <span className="text-[11px] text-slate-500">Payment receipt / screenshot uploaded</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewScreenshotUrl(getFullImageUrl(invoice.payment_screenshot))}
                  className="rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                >
                  View Screenshot 🔍
                </button>
              </div>
            )}
          </div>
        )}

        <InvoicePreview invoice={invoice} location={location} />

        <MarkPaidModal
          open={showPaidModal}
          invoiceNumber={invoice.invoice_number}
          totalAmount={invoice.total_amount}
          submitting={updating}
          serverError={modalError}
          onSubmit={confirmPaid}
          onClose={() => setShowPaidModal(false)}
        />

        {/* Screenshot Lightbox Modal */}
        {viewScreenshotUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
            onClick={() => setViewScreenshotUrl(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-2">
                <h4 className="text-xs font-bold text-slate-800">Payment Screenshot Proof</h4>
                <button
                  type="button"
                  onClick={() => setViewScreenshotUrl(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-2 max-h-[78vh] overflow-auto flex justify-center">
                <img
                  src={viewScreenshotUrl}
                  alt="Payment receipt proof"
                  className="max-h-[72vh] rounded-lg object-contain"
                />
              </div>
              <div className="mt-2 flex justify-end px-2">
                <a
                  href={viewScreenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Open in New Tab ↗
                </a>
              </div>
            </div>
          </div>
        )}
        {showEditModal && (
          <EditInvoiceModal
            invoice={invoice}
            onSave={handleSaveDetails}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

export default InvoiceDetail;
