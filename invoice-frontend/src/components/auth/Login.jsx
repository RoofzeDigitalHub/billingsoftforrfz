import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import { setSession } from "../../utils/auth";

const QUICK_ADMINS = [
  { email: "jaymewada42@gmail.com", label: "Jay Mewada" },
  { email: "roofzedigitalhub@gmail.com", label: "Roofze Digital Hub" },
  { email: "vidyashetye35@gmail.com", label: "Vidya Shetye" },
];

function Login() {
  const navigate = useNavigate();

  // Step state: 1 = Enter Email, 2 = Enter OTP
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when step 2 opens
  useEffect(() => {
    if (step === 2 && otpInputsRef.current[0]) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Please enter your registered admin email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendOtp(targetEmail);
      setSuccessMsg(res.message || "OTP sent successfully! Please check your inbox.");
      setStep(2);
      setResendCooldown(60);
      if (res.fallbackOtp) {
        setOtpDigits(String(res.fallbackOtp).split(""));
      } else {
        setOtpDigits(["", "", "", "", "", ""]);
      }
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please check your email or network.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle individual OTP input changes
  const handleOtpChange = (index, value) => {
    // Only accept numeric input
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    // If user typed one character
    const char = cleanVal.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle paste full 6 digits
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || "";
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasteData.length, 5);
    otpInputsRef.current[nextIndex]?.focus();
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    const otpCode = otpDigits.join("").trim();
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email.trim().toLowerCase(), otpCode);
      setSuccessMsg("Verification successful! Opening dashboard...");
      setSession({ token: res.token, user: res.user });

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans selection:bg-lime-400 selection:text-slate-950">
      {/* Brand Hero Side (Desktop) */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 text-white lg:flex border-r border-slate-800/80">
        {/* Glow Spheres */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-[450px] w-[450px] rounded-full bg-teal-500/15 blur-[120px]" />
        <div className="pointer-events-none absolute -left-20 bottom-10 h-[380px] w-[380px] rounded-full bg-lime-400/10 blur-[130px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 ring-1 ring-lime-400/30 shadow-lg shadow-lime-400/5">
            <span className="text-base font-black tracking-wider text-lime-400">RZ</span>
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-white">
              ROOF<span className="text-lime-400">ZE</span> DIGITAL HUB
            </div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Billing & Proposal Suite
            </div>
          </div>
        </div>

        {/* Center Hero Information */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-3.5 py-1 text-xs font-semibold text-lime-300 mb-6 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400"></span>
            </span>
            Passwordless Secure OTP Portal
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-tight tracking-tight text-white mb-5">
            Admin Console for <br />
            <span className="bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Invoices & Billing.
            </span>
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-slate-400 mb-8">
            GST & Non-GST invoice generation, multi-milestone payments, custom proposals, and client management. Access is strictly restricted to verified administrative personnel.
          </p>

          {/* Security Features Card */}
          <div className="grid grid-cols-2 gap-3.5 max-w-md">
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Zero-Password Risk
              </div>
              <div className="text-[11px] text-slate-400">Dynamic 6-digit OTP delivery directly to registered inbox</div>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 backdrop-blur-sm">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Authorized Only
              </div>
              <div className="text-[11px] text-slate-400">Database pre-validated email whitelist check on every login</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-900 pt-6">
          <span>© {new Date().getFullYear()} Roofze Digital Hub LLP</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            System Live & Protected
          </span>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-slate-950">
        {/* Subtle background gradient for mobile/right side */}
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-lime-400/5 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-teal-500/5 blur-[100px]" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Top Brand Header */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-lime-400/30">
              <span className="text-sm font-black text-lime-400">RZ</span>
            </div>
            <div className="text-base font-extrabold text-white">ROOFZE DIGITAL HUB</div>
          </div>

          {/* Stepper Pill Indicator */}
          <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => step === 2 && setStep(1)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                step === 1
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              1. Admin Email
            </button>
            <div className="px-2 text-slate-600 text-xs">→</div>
            <button
              type="button"
              disabled={step === 1}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                step === 2
                  ? "bg-lime-400 text-slate-950 shadow-sm shadow-lime-400/20"
                  : "text-slate-600 cursor-not-allowed"
              }`}
            >
              2. OTP Code
            </button>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl">
            {step === 1 ? (
              /* ================= STEP 1: EMAIL INPUT ================= */
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-white">Admin Sign In</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Enter your authorized Roofze email to receive a secure OTP code.
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label htmlFor="adminEmail" className="mb-1.5 block text-xs font-semibold text-slate-300">
                      Authorized Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                        </svg>
                      </div>
                      <input
                        id="adminEmail"
                        type="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="e.g. jaymewada42@gmail.com"
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
                      />
                    </div>
                  </div>

                  {/* Quick Select Chips */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                      <span>Authorized Accounts:</span>
                      <span className="text-[10px] text-lime-400/80">Click to fill</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {QUICK_ADMINS.map((admin) => (
                        <button
                          key={admin.email}
                          type="button"
                          onClick={() => {
                            setEmail(admin.email);
                            setError("");
                          }}
                          className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-left text-xs transition ${
                            email.toLowerCase() === admin.email.toLowerCase()
                              ? "border-lime-400/60 bg-lime-400/10 text-lime-300 font-semibold"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{admin.email}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{admin.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      <svg className="h-4 w-4 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-lime-400/10"
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Dispatching OTP via SMTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Login OTP</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
                  <p className="text-[11px] text-slate-500">
                    OTP will be dispatched from <strong className="text-slate-400 font-medium">roofzedigitalhub@gmail.com</strong>
                  </p>
                </div>
              </div>
            ) : (
              /* ================= STEP 2: OTP VERIFICATION ================= */
              <div>
                <div className="mb-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400 mb-3 ring-1 ring-lime-400/20">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Verify Code</h2>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Sent to: <strong className="text-slate-200">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setError("");
                      }}
                      className="font-medium text-lime-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {successMsg && (
                  <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 6 Digit Input Boxes */}
                  <div>
                    <label className="mb-2 block text-center text-xs font-semibold text-slate-300">
                      Enter 6-Digit One-Time Passcode
                    </label>
                    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputsRef.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-slate-700/80 bg-slate-950 text-center text-xl sm:text-2xl font-black text-white shadow-inner outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      <svg className="h-4 w-4 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join("").length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-300 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-lime-400/10"
                  >
                    {loading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span>Validating OTP Code...</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Verify & Enter Dashboard</span>
                      </>
                    )}
                  </button>

                  {/* Resend Section */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs">
                    <span className="text-slate-500">Didn't receive the code?</span>
                    {resendCooldown > 0 ? (
                      <span className="font-medium text-slate-400">
                        Resend in <span className="text-lime-400 font-bold">{resendCooldown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="font-bold text-lime-400 hover:text-lime-300 hover:underline disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Quick Help Note */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Having trouble logging in? Contact{" "}
            <a href="mailto:roofzedigitalhub@gmail.com" className="text-slate-400 underline hover:text-white">
              roofzedigitalhub@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
