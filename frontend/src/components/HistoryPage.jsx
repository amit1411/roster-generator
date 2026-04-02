function SummaryCard({ label, value, tone = "default" }) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatSessionTime(value) {
  if (!value) return "Just now";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Just now";
  }
}

function formatDrawType(drawType) {
  return drawType === "league_knockout" ? "League + Knockout" : "Round Robin";
}

function SessionHistoryCard({ session, onOpenSession }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{session.name}</h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Completed
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{formatDrawType(session.drawType)}</p>
          <p className="mt-2 text-sm text-slate-500">
            {session.endedRounds} / {session.totalRounds || "?"} rounds completed
          </p>
          <p className="mt-1 text-xs text-slate-400">Finished {formatSessionTime(session.updatedAt)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenSession(session.sessionId)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Open Results
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage({
  sessions,
  activeSessionCount,
  sessionsLoading,
  sessionsLoadingLabel,
  sessionWaitText,
  onRefresh,
  onOpenSession,
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-500 to-emerald-500 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-100">History</p>
            <h2 className="mt-2 text-3xl font-bold">Completed sessions and player records</h2>
            <p className="mt-3 text-sm text-sky-50">
              Live work stays in Active Sessions. History is reserved for finished sessions only, so browsing results
              never gets mixed up with in-progress scoring.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={sessionsLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
          >
            {sessionsLoading ? sessionWaitText(sessionsLoadingLabel) : "Refresh History"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Completed Sessions" value={sessions.length} tone="emerald" />
        <SummaryCard label="Latest Results" value={sessions[0]?.name || "No completed sessions yet"} tone="sky" />
        <SummaryCard label="Still Active" value={activeSessionCount} tone="amber" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completed Sessions</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Recent results</h3>
          </div>
          <p className="text-sm text-slate-500">Open a finished session to review the final standings and bracket.</p>
        </div>

        <div className="mt-5 space-y-3">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionHistoryCard
                key={session.sessionId}
                session={session}
                onOpenSession={onOpenSession}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No completed sessions yet. As soon as a session is fully finished, it will move here automatically.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
