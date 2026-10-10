import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

function AppLayout({ title, subtitle, breadcrumbs, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("rfz_sidebar_collapsed") === "true";
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("rfz_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <Navbar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-xl font-extrabold text-slate-900 dark:text-white sm:text-2xl tracking-tight">{title}</h1>}
              {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
