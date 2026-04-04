import { historyPageCopy } from "../content/uiCopy";

function formatDate(value) {
  if (!value) return "Unknown";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Unknown";
  }
}

function formatDrawType(drawType) {
  return drawType === "league_knockout" ? "League + Knockout" : "Round Robin";
}

function HistoryIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 6v6l4 2.2" />
      <path d="M4.8 11a7.2 7.2 0 1 1 2.1 6" />
      <path d="M4.5 6.5v4.8h4.8" />
    </svg>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
        <HistoryIcon />
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

export default function HistoryPage({ sessions, sessionsLoading, onRefresh, onOpen, onDelete, sessionAccess }) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-emerald-50">{historyPageCopy.hero.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold">{historyPageCopy.hero.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-teal-50">
          {historyPageCopy.hero.description}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{historyPageCopy.section.eyebrow}</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <HistoryIcon />
              </span>
              <h2 className="text-lg font-semibold text-gray-900">{historyPageCopy.section.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={sessionsLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {sessionsLoading ? historyPageCopy.section.refreshLoading : historyPageCopy.section.refresh}
          </button>
        </div>
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.session_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{session.session_name}</h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {historyPageCopy.section.completed}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{formatDrawType(session.draw_type)}</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {session.total_matches} matches • {session.total_players} players
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Finished {formatDate(session.completed_at)}</p>
                    {session.champion_pair ? (
                      <p className="mt-2 text-sm font-medium text-emerald-700">{historyPageCopy.section.championPrefix} {session.champion_pair}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => onOpen(session.session_id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      {historyPageCopy.section.open}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(session.session_id)}
                      disabled={!sessionAccess[session.session_id]}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {historyPageCopy.section.delete}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title={historyPageCopy.section.emptyTitle}
              description={historyPageCopy.section.emptyDescription}
            />
          )}
        </div>
      </section>
    </div>
  );
}
