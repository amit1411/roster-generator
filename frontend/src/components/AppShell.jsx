import { appCopy } from "../content/uiCopy";

function BrandIcon({ className = "h-10 w-10" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="brand-gradient" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.55" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="14" fill="url(#brand-gradient)" />
      <path d="M24 11.5 17.5 19 24 22.2 30.5 19 24 11.5Z" fill="white" fillOpacity="0.96" />
      <path d="M24 23.8 15 20.1 18.1 31.5 24 37l5.9-5.5L33 20.1l-9 3.7Z" fill="white" fillOpacity="0.92" />
      <path d="M20.8 27.4 18.7 33.1M24 26.9V37M27.2 27.4l2.1 5.7" stroke="#4F46E5" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function NavIcon({ kind, className = "h-4 w-4" }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  switch (kind) {
    case "planner":
      return (
        <svg {...commonProps}>
          <path d="M4.5 6.5h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 17.5h9" />
          <path d="M18 16.8 19.8 18.6 16.5 21H14.7v-1.8L18 16.8Z" />
        </svg>
      );
    case "players":
      return (
        <svg {...commonProps}>
          <path d="M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...commonProps}>
          <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
          <path d="M8 3.8v3.4M16 3.8v3.4M4.5 10h15" />
        </svg>
      );
    case "history":
      return (
        <svg {...commonProps}>
          <path d="M12 6v6l4 2.2" />
          <path d="M4.8 11a7.2 7.2 0 1 1 2.1 6" />
          <path d="M4.5 6.5v4.8h4.8" />
        </svg>
      );
    case "stats":
      return (
        <svg {...commonProps}>
          <path d="M5 18.5h14" />
          <path d="M7.5 16V11.5" />
          <path d="M12 16V8.5" />
          <path d="M16.5 16V6" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
          <path d="M5.25 19.25a6.75 6.75 0 0 1 13.5 0" />
          <path d="M17.75 7.5h1.75" />
          <path d="M18.625 6.625v1.75" />
        </svg>
      );
    default:
      return null;
  }
}

function MenuIcon({ open, className = "h-5 w-5" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": true,
  };

  return open ? (
    <svg {...props}>
      <path d="M6 6 18 18" />
      <path d="m18 6-12 12" />
    </svg>
  ) : (
    <svg {...props}>
      <path d="M4.5 7h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 17h15" />
    </svg>
  );
}

export default function AppShell({
  view,
  currentSessionName,
  currentUser,
  isOrganizer,
  activeWorkspace,
  authLoading,
  onOpenAuth,
  onLogout,
  mobileNavOpen,
  onToggleMobileNav,
  onCloseMobileNav,
  onNavigate,
  onHome,
  navItems,
  hideHeader = false,
  children,
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideHeader ? (
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={onHome} className="flex min-w-0 items-center gap-3 text-left">
              <BrandIcon className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-500">{appCopy.brand.eyebrow}</p>
                <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">{appCopy.brand.title}</h1>
                {view === "scoring" && currentSessionName ? (
                  <p className="truncate text-xs font-medium text-gray-500 md:hidden">{currentSessionName}</p>
                ) : null}
              </div>
            </button>

            <div className="hidden items-center gap-3 md:flex">
              {currentUser ? (
                <>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{currentUser.display_name}</p>
                    <p className="text-xs text-slate-500">
                      {isOrganizer ? (activeWorkspace?.name || "Organizer workspace") : "Signed in"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate("profile")}
                    className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      view === "profile"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={authLoading}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuth("login")}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Login
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleMobileNav}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-global-nav"
              aria-label="Open navigation"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 md:hidden"
            >
              <MenuIcon open={mobileNavOpen} />
            </button>
          </div>

          <nav className="mt-4 hidden flex-wrap gap-2 md:flex">
            {navItems.map((item) => {
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <NavIcon kind={item.icon} className="mr-2 h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {mobileNavOpen ? (
            <div className="md:hidden">
              <div className="fixed inset-0 z-40 bg-slate-900/35" onClick={onCloseMobileNav} aria-hidden="true" />
              <nav
                id="mobile-global-nav"
                className="fixed inset-x-4 top-[6.5rem] z-50 rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl"
              >
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Navigate</p>
                <div className="mb-3 rounded-2xl bg-slate-50 p-3">
                  {currentUser ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{currentUser.display_name}</p>
                        <p className="text-xs text-slate-500">{isOrganizer ? (activeWorkspace?.name || "Organizer workspace") : currentUser.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => onNavigate("profile")}
                          className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold ${
                            view === "profile"
                              ? "bg-slate-900 text-white"
                              : "border border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={onLogout}
                          disabled={authLoading}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenAuth("login")}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Login
                    </button>
                  )}
                </div>
                <div className="grid gap-2">
                  {navItems.map((item) => {
                    const isActive = view === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onNavigate(item.key)}
                        className={`flex min-h-12 items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <NavIcon kind={item.icon} className="mr-3 h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          ) : null}
        </div>
      </header>
      ) : null}

      <main className={`mx-auto px-4 ${hideHeader ? "max-w-6xl py-8 sm:py-10" : "max-w-7xl py-6"}`}>{children}</main>
    </div>
  );
}
