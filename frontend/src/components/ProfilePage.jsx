import { profilePageCopy } from "../content/uiCopy";

function WorkspaceHomeIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4.75 8.25 12 4l7.25 4.25v7.5L12 20l-7.25-4.25Z" />
      <path d="M12 4v16" />
      <path d="m4.75 8.25 7.25 4.25 7.25-4.25" />
    </svg>
  );
}

function AccountIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function WorkspaceTypeLabel({ type }) {
  if (type === "club") return profilePageCopy.hero.clubType;
  return profilePageCopy.hero.personalType;
}

function WorkspaceStatusPill({ children, tone = "default" }) {
  const tones = {
    default: "border-slate-200 bg-white/80 text-slate-700",
    strong: "border-white/15 bg-slate-950/10 text-slate-950",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 sm:text-[15px]">{value}</p>
    </div>
  );
}

function EmptyWorkspaceState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <WorkspaceHomeIcon />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{profilePageCopy.workspaces.emptyTitle}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{profilePageCopy.workspaces.emptyDescription}</p>
    </div>
  );
}

export default function ProfilePage({
  currentUser,
  activeWorkspace,
  workspaces,
  authLoading,
  onSelectWorkspace,
  onLogout,
}) {
  const workspaceList = Array.isArray(workspaces) ? workspaces : [];
  const hasWorkspaces = workspaceList.length > 0;
  const activeWorkspaceId = activeWorkspace?.workspace_id || null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-[#d9e3ea] bg-[#f8f4ec] shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.12),_transparent_26%),radial-gradient(circle_at_85%_20%,_rgba(14,165,233,0.14),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(255,255,255,0.5))]" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end lg:gap-8 lg:p-10">
          <div>
            <div className="flex flex-wrap gap-2">
              <WorkspaceStatusPill>{profilePageCopy.hero.eyebrow}</WorkspaceStatusPill>
              <WorkspaceStatusPill tone="strong">{profilePageCopy.hero.role}</WorkspaceStatusPill>
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              {activeWorkspace ? <WorkspaceTypeLabel type={activeWorkspace.workspace_type} /> : profilePageCopy.hero.noWorkspace}
            </p>
            <h2
              className="mt-3 max-w-xl text-[2.5rem] font-semibold leading-[0.96] text-slate-950 sm:text-[3.5rem]"
              style={{ fontFamily: "Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif" }}
            >
              {activeWorkspace?.name || profilePageCopy.hero.title}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-700 sm:text-base">
              {profilePageCopy.hero.description}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{profilePageCopy.account.eyebrow}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <AccountIcon />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-slate-950">{currentUser?.display_name || "Organizer"}</h3>
                <p className="truncate text-sm text-slate-500">{currentUser?.email || "No email available"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailRow label={profilePageCopy.account.accessLabel} value={profilePageCopy.account.accessValue} />
              <DetailRow label={profilePageCopy.account.workspaceLabel} value={activeWorkspace?.name || profilePageCopy.hero.noWorkspace} />
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={authLoading}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {profilePageCopy.account.logout}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{profilePageCopy.account.eyebrow}</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">{profilePageCopy.account.title}</h3>
          <div className="mt-5 space-y-3">
            <DetailRow label="Name" value={currentUser?.display_name || "Organizer"} />
            <DetailRow label={profilePageCopy.account.emailLabel} value={currentUser?.email || "No email available"} />
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{profilePageCopy.workspaces.eyebrow}</p>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">{profilePageCopy.workspaces.title}</h3>
            </div>
            <p className="max-w-sm text-sm leading-6 text-slate-500">{profilePageCopy.workspaces.description}</p>
          </div>

          <div className="mt-6">
            {hasWorkspaces ? (
              <div className="grid gap-3">
                {workspaceList.map((workspace) => {
                  const isCurrent = workspace.workspace_id === activeWorkspaceId;
                  return (
                    <div
                      key={workspace.workspace_id}
                      className={`rounded-[24px] border px-4 py-4 transition-colors sm:px-5 ${
                        isCurrent
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold">{workspace.name}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              isCurrent ? "bg-white/12 text-slate-100" : "bg-white text-slate-500"
                            }`}>
                              <WorkspaceTypeLabel type={workspace.workspace_type} />
                            </span>
                          </div>
                          <p className={`mt-2 text-sm ${isCurrent ? "text-slate-300" : "text-slate-500"}`}>
                            {isCurrent ? profilePageCopy.workspaces.current : "Available workspace"}
                          </p>
                        </div>
                        {isCurrent ? (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                            {profilePageCopy.workspaces.current}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectWorkspace(workspace.workspace_id)}
                            disabled={authLoading}
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            {authLoading ? profilePageCopy.workspaces.switchLoading : profilePageCopy.workspaces.switch}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyWorkspaceState />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
