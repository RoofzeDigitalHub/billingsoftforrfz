import { getSession } from "../../utils/auth";
import { useTheme } from "../../utils/theme";
import { IconMenu, IconBell, IconSun, IconMoon } from "../icons/Icons";

function Navbar({ breadcrumbs, onMenuClick }) {
  const session = getSession();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 lg:px-8 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>

        {/* Breadcrumbs (Left aligned now that search bar is removed) */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            {breadcrumbs.map((crumb, idx) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {idx > 0 && <span>/</span>}
                <span className={idx === breadcrumbs.length - 1 ? "font-semibold text-slate-700 dark:text-slate-200" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Right side items: Theme toggle + Notifications + User profile (Chevron removed) */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? <IconSun className="h-4 w-4 text-amber-400" /> : <IconMoon className="h-4 w-4 text-slate-600" />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Notifications"
          >
            <IconBell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>

          {/* User profile (No dropdown chevron down icon) */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xs font-bold text-white shadow-sm">
              {(session?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{session?.name || "Admin"}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">{session?.role || "User"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
