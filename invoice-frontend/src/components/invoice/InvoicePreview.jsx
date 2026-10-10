import roofzeLogo from "../../assets/roofze-logo.png";

// Brand colours (taken from the Roofze invoice reference design)
const DARK = "#14171a";
const TEAL = "#2ea49b";
const LIME = "#c8e47d";

/**
 * Currency formatter matching the reference PDF design:
 * In table: ₹33,040
 * In totals: ₹33,040 .00 (with space before .00)
 */
function formatINRClean(n) {
  const num = Number(n || 0);
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatINRWithDecimals(n) {
  const num = Number(n || 0);
  const formatted = num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `₹${formatted} .00`;
}

function formatSubtotalNumber(n) {
  const num = Number(n || 0);
  return num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** The milestone actually billed on this invoice for one item, if any. */
function getBilledMilestone(item) {
  if (!item.milestones || item.milestones.length === 0) return null;
  const billed = item.milestones.find((m) => m.billed);
  if (!billed) return null;
  const order = item.milestones.findIndex((m) => m.billed) + 1;
  return { ...billed, order, total: item.milestones.length };
}

/**
 * Formats the service description to match the reference invoice:
 * e.g. "Milestone 2 – Project Initiation Payment (25%) – RTI Voice Digital Platform"
 */
function renderItemDescription(item) {
  const billedMilestone = getBilledMilestone(item);
  if (!billedMilestone) {
    return item.service_description;
  }

  // If item already contains milestone wording, avoid repeating
  const desc = item.service_description || "";
  if (desc.toLowerCase().includes("milestone") && desc.includes("%")) {
    return desc;
  }

  const milestoneTitle =
    billedMilestone.label ||
    `Milestone ${billedMilestone.order}`;
  const milestoneExtra = billedMilestone.description || billedMilestone.name;
  const pct = billedMilestone.percent || item.price_percentage || 25;

  return milestoneExtra
    ? `${milestoneTitle} – ${milestoneExtra} (${pct}%) – ${desc}`
    : `${milestoneTitle} (${pct}%) – ${desc}`;
}

const iconProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "shrink-0",
};

function GlobeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 7.5l1.4 2.4-1 1.1a6 6 0 003 3l1.1-1 2.4 1.4-.5 1.6c-.2.6-.8.9-1.4.8A9 9 0 017.2 9.3c-.1-.6.2-1.2.8-1.4L9 7.5z" />
    </svg>
  );
}

/**
 * InvoicePreview: Exact match with the reference PDF & user specifications.
 * - Full width 2-color header (Dark + Slanted Lime PAID block) + Teal contact bar
 * - 30px page padding
 * - Large Roofze logo watermark in the exact center of the page
 * - Full width 2-color footer (Teal slanted into Dark)
 */
function InvoicePreview({ invoice, location }) {
  if (!invoice || !location) return null;

  const isGst = location.location_type === "GST";
  const isPaid = invoice.payment_status === "PAID";

  return (
    <div
      id="invoice-print-area"
      className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:min-h-[296mm] print:border-none print:shadow-none min-h-[960px]"
      style={{ fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* 1. Header: Full-width Dark top bar + slanted Lime PAID / UNPAID block */}
      <div>
        <div className="flex h-20 items-stretch sm:h-24 bg-[#14171a]">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 sm:gap-4 sm:px-7">
            <img
              src={roofzeLogo}
              alt="Roofze"
              className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <div className="text-base font-black leading-tight tracking-tight sm:text-xl">
                <span style={{ color: LIME }}>ROOF</span>
                <span style={{ color: TEAL }}>ZE DIGITAL HUB LLP</span>
              </div>
              <div className="mt-1 text-[8px] font-semibold tracking-[0.24em] text-white sm:text-[11px]">
                EMPOWER YOUR DIGITAL JOURNEY
              </div>
            </div>
          </div>
          <div
            className="flex w-32 shrink-0 items-center justify-center pl-4 text-xl font-black sm:w-64 sm:text-3xl tracking-wider"
            style={{
              backgroundColor: isPaid ? LIME : "#ef4444",
              color: isPaid ? DARK : "#ffffff",
              clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          >
            {isPaid ? "PAID" : "UNPAID"}
          </div>
        </div>

        {/* 2. Full-width Teal contact bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[11px] font-medium text-white sm:px-8 sm:text-[12.5px]"
          style={{ backgroundColor: TEAL }}
        >
          <span className="flex items-center gap-2">
            <GlobeIcon /> www.roofze.com
          </span>
          <span className="flex items-center gap-2">
            <MailIcon /> roofzedigitalhub@gmail.com
          </span>
          <span className="flex items-center gap-2">
            <PhoneIcon /> +91 91677 00605
          </span>
        </div>
      </div>

      {/* 3. Main Document Body with 30px padding */}
      <div className="relative flex-1 p-[30px] flex flex-col justify-between">
        {/* Large Roofze Logo Watermark placed in the exact center of the page */}
        <img
          src={roofzeLogo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 w-[440px] max-w-[70%] -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.05]"
        />

        <div className="relative z-10">
          {/* Header Row: INVOICE / Billed to (Left) vs Number / Payment to (Right) */}
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Left Column */}
            <div>
              <div
                className="text-xl sm:text-2xl font-bold tracking-tight uppercase"
                style={{ color: TEAL }}
              >
                INVOICE
              </div>
              <div className="mt-4 text-xs sm:text-sm">
                <div className="font-semibold text-slate-700">Billed to:</div>
                <div
                  className="mt-0.5 text-sm sm:text-base font-bold leading-snug"
                  style={{ color: TEAL }}
                >
                  {invoice.client_name || "—"}
                </div>
                <div className="mt-0.5 text-slate-800 font-medium">
                  {invoice.client_contact}
                </div>
                {invoice.client_gst_number && (
                  <div className="mt-1 font-bold text-slate-900 tracking-wide">
                    GST IN : {invoice.client_gst_number}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="sm:text-right">
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {invoice.invoice_number}
              </div>
              <div className="mt-4 text-xs sm:text-sm">
                <div className="font-semibold text-slate-700">Payment to:</div>
                <div
                  className="mt-0.5 text-sm sm:text-base font-bold leading-snug"
                  style={{ color: TEAL }}
                >
                  ROOFZE DIGITAL HUB LLP
                </div>
                {isGst && (
                  <>
                    <div className="mt-0.5 font-bold text-slate-900 tracking-wide">
                      GST IN : {location.gst_number}
                    </div>
                    <div className="mt-0.5 font-bold text-slate-900 tracking-wide">
                      PAN: {location.pan_number}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 4. Service Items Table */}
          <div className="mb-6 overflow-x-auto">
            <div className="relative min-w-[500px]">
              {/* Header Strip with exact 3-tone gradient (Lime SERVICE -> Teal wedge -> Dark Slate rest) */}
              <div
                className="absolute inset-x-0 top-0 h-11"
                style={{
                  background: `linear-gradient(110deg, ${LIME} 0%, ${LIME} 51%, ${TEAL} 51%, ${TEAL} 56.5%, ${DARK} 56.5%, ${DARK} 100%)`,
                }}
              />
              <table className="relative w-full text-xs sm:text-sm">
                <thead>
                  <tr className="h-11">
                    <th
                      className="w-[51%] px-4 text-left font-black tracking-wider uppercase text-slate-950"
                    >
                      SERVICE
                    </th>
                    <th className="w-[13%] px-2 text-center font-bold tracking-wider text-white uppercase">
                      QTY
                    </th>
                    <th className="w-[18%] px-3 text-right font-bold tracking-wider text-white uppercase">
                      PRICE
                    </th>
                    <th className="w-[18%] px-4 text-right font-bold tracking-wider text-white uppercase">
                      SUBTOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="align-top border-b border-slate-100">
                      <td className="w-[51%] px-4 py-4 text-slate-900 font-medium leading-relaxed">
                        {renderItemDescription(item)}
                      </td>
                      <td className="w-[13%] px-2 py-4 text-center text-slate-900 font-medium">
                        {item.qty || 1}
                      </td>
                      <td className="w-[18%] px-3 py-4 text-right text-slate-900 font-medium">
                        {formatINRClean(item.subtotal || item.total_price)}
                      </td>
                      <td className="w-[18%] px-4 py-4 text-right font-semibold text-slate-900">
                        {formatSubtotalNumber(item.subtotal || item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Horizontal separator line */}
          <div className="border-t-2 border-slate-900 my-5" />

          {/* 5. Payment Note (Left) & Totals (Right) */}
          <div className="flex flex-col-reverse justify-between gap-6 sm:flex-row sm:items-start">
            {/* Left side: Received note or Terms */}
            <div className="flex-1 sm:pr-8">
              {isPaid ? (
                <div className="space-y-1">
                  <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Thank you. Your payment has
                    <br />
                    been received by {invoice.payment_mode || "Google Pay"}.
                  </div>
                  {invoice.payment_reference && (
                    <div className="text-sm sm:text-base font-bold text-slate-900">
                      Transaction ID : {invoice.payment_reference}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-1 font-bold text-slate-900 text-xs sm:text-sm">
                    Terms and conditions :
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed italic">
                    {invoice.terms ||
                      "Please ensure that payment is made within seven days of receipt of this invoice."}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Subtotal, GST, Total */}
            <div className="w-full sm:w-72 space-y-1.5">
              <div className="flex items-center justify-between px-2 text-sm sm:text-base">
                <span className="text-slate-800 font-medium">Subtotal</span>
                <span className="text-slate-900 font-bold">
                  {formatINRWithDecimals(invoice.subtotal_amount)}
                </span>
              </div>

              {isGst && invoice.gst_amount > 0 && (
                <div className="flex items-center justify-between px-2 text-sm sm:text-base">
                  <span className="text-slate-800 font-medium">GST {invoice.gst_percentage}%</span>
                  <span className="text-slate-900 font-bold">
                    {formatINRWithDecimals(invoice.gst_amount)}
                  </span>
                </div>
              )}

              {/* Solid Teal Total Box */}
              <div
                className="mt-2 flex items-center justify-between rounded-lg px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-sm"
                style={{ backgroundColor: TEAL }}
              >
                <span className="text-base sm:text-lg font-bold">Total</span>
                <span className="text-base sm:text-lg font-bold">
                  {formatINRWithDecimals(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Payment Details */}
          <div className="mt-8">
            <div className="text-sm sm:text-base font-bold text-slate-900">
              Payment Details :
            </div>
            <div className="mt-1.5 border-t-2 border-slate-900" />
            <div className="mt-2.5 grid grid-cols-[105px_1fr] sm:grid-cols-[115px_1fr] gap-y-1 text-xs sm:text-sm text-slate-800 font-medium">
              <span>Bank Name</span>
              <span>: {location.bank_name || "Indusind bank"}</span>
              <span>A/c Name</span>
              <span>: {location.account_name || "ROOFZE DIGITAL HUB LLP"}</span>
              <span>A/c Number</span>
              <span>: {location.account_number || "258916532869"}</span>
              <span>IFSC code</span>
              <span>: {location.ifsc_code || "INDB0001889"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Full-width 2-Color Angled Footer Bar */}
      <div className="relative mt-auto h-6 sm:h-7 w-full bg-[#14171a]">
        <div
          className="absolute inset-y-0 left-0 w-[54%]"
          style={{
            backgroundColor: TEAL,
            clipPath: "polygon(0 0, 92% 0, 100% 100%, 0 100%)",
          }}
        />
      </div>
    </div>
  );
}

export default InvoicePreview;
