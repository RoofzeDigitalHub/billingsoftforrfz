import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSession, logout } from "../../utils/auth";
import {
  IconHome,
  IconInvoice,
  IconList,
  IconUsers,
  IconFileText,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
} from "../icons/Icons";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: IconHome },
  { to: "/dashboard/invoices/Create", label: "Create Invoice", icon: IconInvoice },
  { to: "/dashboard/invoices", label: "All Invoices", icon: IconList },
  { to: "/dashboard/proposals/create", label: "Create Proposal", icon: IconPlus },
  { to: "/dashboard/proposals", label: "All Proposals", icon: IconFileText },
  { to: "/dashboard/clients", label: "Clients", icon: IconUsers },
];

/** True when `pathname` is exactly `to` or a child route of it (segment-aware). */
function matchesPath(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function getActiveNavPath(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const matches = NAV_ITEMS.filter((item) => matchesPath(clean, item.to));
  if (matches.length === 0) return null;
  return matches.reduce((best, item) => (item.to.length > best.to.length ? item : best)).to;
}

function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const activePath = getActiveNavPath(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const content = (
    <aside
      className={`flex h-full shrink-0 flex-col bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300 ease-in-out border-r border-slate-800/80 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header section with Logo & Open/Close Toggle Button */}
      <div
        className={`flex items-center border-b border-white/10 px-4 py-4 ${
          isCollapsed ? "flex-col justify-center gap-2" : "justify-between"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/20">
            <span className="text-sm font-extrabold text-lime-300">RZ</span>
          </div>
          {!isCollapsed && (
            <div className="leading-tight min-w-0 overflow-hidden">
              <div className="truncate text-sm font-extrabold">
                ROOF<span className="text-lime-300">ZE</span>
              </div>
              <div className="truncate text-[10px] text-white/40">DIGITAL HUB LLP</div>
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition"
          title={isCollapsed ? "Open menu" : "Close menu"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <IconChevronRight className="h-4 w-4" /> : <IconChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === activePath;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
                isCollapsed ? "justify-center px-0" : "gap-3 px-3.5"
              } ${
                isActive
                  ? "bg-lime-300 text-slate-950 font-bold shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Brand Slogan Card (Only when menu is open) */}
      {!isCollapsed && (
        <div className="mx-3 mb-3 rounded-2xl bg-white/5 p-4 border border-white/5">
          <p className="text-xs font-bold leading-snug">
            All Your <span className="text-lime-300">Digital Needs</span> Under One Roof
          </p>
          <div className="mt-2 h-0.5 w-8 bg-lime-300" />
        </div>
      )}

      {/* Footer Profile & Logout */}
      <div className="border-t border-white/10 p-3">
        {isCollapsed ? (
          /* Collapsed mini profile */
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white shadow-sm"
              title={`${session?.name || "Admin"} (${session?.role || "User"})`}
            >
              {(session?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-red-500/20 hover:text-red-400 transition"
              title="Log out"
              aria-label="Log out"
            >
              <IconLogout className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Expanded full profile */
          <div>
            <div className="mb-2 flex items-center gap-3 px-1 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white shadow-sm">
                {(session?.name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="overflow-hidden leading-tight min-w-0">
                <div className="truncate text-sm font-semibold">{session?.name || "Admin"}</div>
                <div className="truncate text-[11px] text-white/40">{session?.role || "User"}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-white/60 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <IconLogout className="h-4 w-4 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible, responsive width */}
      <div className="hidden lg:block h-screen sticky top-0">{content}</div>

      {/* Mobile: off-canvas drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${isOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`absolute inset-y-0 left-0 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* On mobile drawer always show full width with text */}
          <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/20">
                  <span className="text-sm font-extrabold text-lime-300">RZ</span>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-extrabold">
                    ROOF<span className="text-lime-300">ZE</span>
                  </div>
                  <div className="text-[10px] text-white/40">DIGITAL HUB LLP</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {NAV_ITEMS.map((item) => {
                const isActive = item.to === activePath;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive ? "bg-lime-300 text-slate-950 font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex items-center gap-3 px-2 py-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-xs font-bold">
                  {(session?.name || "A").slice(0, 1).toUpperCase()}
                </div>
                <div className="overflow-hidden leading-tight">
                  <div className="truncate text-sm font-semibold">{session?.name || "Admin"}</div>
                  <div className="truncate text-[11px] text-white/40">{session?.role || "User"}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-white/60 transition hover:bg-red-500/10 hover:text-red-400"
              >
                <IconLogout className="h-4 w-4" />
                Log out
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
