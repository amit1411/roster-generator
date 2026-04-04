import { activeSessionsPageCopy } from "../content/uiCopy";

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

function formatSessionStatus(session) {
  if (session.status === "completed") return "Completed";
  if (session.liveRounds > 0) return `${session.liveRounds} round${session.liveRounds > 1 ? "s" : ""} live`;
  if (session.status === "in_progress") return "In Progress";
  return "Ready";
}

function SessionCard({ session, isCurrent, feedback, canScore, onOpen, onCopy, onDelete, onRename }) {
  const statusTone =
    session.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : session.liveRounds > 0
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{session.name}</h3>
            {isCurrent ? (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                Current
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>
              {formatSessionStatus(session)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{formatDrawType(session.drawType)}</p>
          <p className="mt-2 text-sm text-gray-500">
            {session.endedRounds} / {session.totalRounds || "?"} rounds ended
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            {canScore ? activeSessionsPageCopy.section.accessScorer : activeSessionsPageCopy.section.accessViewOnly}
          </p>
          <p className="mt-1 text-xs text-gray-400">{activeSessionsPageCopy.section.updatedPrefix} {formatSessionTime(session.updatedAt)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          <button
            type="button"
            onClick={() => onOpen(session.sessionId)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {canScore ? activeSessionsPageCopy.section.openScorer : activeSessionsPageCopy.section.openView}
          </button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onCopy(session.sessionId, "view")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              {feedback?.mode === "view" ? feedback.text : activeSessionsPageCopy.section.copyView}
            </button>
            <button
              type="button"
              onClick={() => onCopy(session.sessionId, "scorer")}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {feedback?.mode === "scorer" ? feedback.text : activeSessionsPageCopy.section.copyScorer}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onRename(session.sessionId, session.name)}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {activeSessionsPageCopy.section.rename}
            </button>
            <button
              type="button"
              onClick={() => onDelete(session.sessionId)}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {activeSessionsPageCopy.section.delete}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActiveSessionsPage({
  sessions,
  currentSessionId,
  sessionAccess,
  shareFeedback,
  sessionsLoading,
  sessionsLoadingLabel,
  sessionWaitText,
  onRefresh,
  onOpen,
  onCopy,
  onDelete,
  onRename,
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-amber-50">{activeSessionsPageCopy.hero.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold">{activeSessionsPageCopy.hero.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-orange-50">
          {activeSessionsPageCopy.hero.description}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{activeSessionsPageCopy.section.eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{activeSessionsPageCopy.section.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{activeSessionsPageCopy.section.description}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={sessionsLoading}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {sessionsLoading ? sessionWaitText(sessionsLoadingLabel) : activeSessionsPageCopy.section.refresh}
          </button>
        </div>
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                isCurrent={session.sessionId === currentSessionId}
                canScore={Boolean(sessionAccess[session.sessionId])}
                feedback={shareFeedback.sessionId === session.sessionId ? shareFeedback : null}
                onOpen={onOpen}
                onCopy={onCopy}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
              {activeSessionsPageCopy.section.emptyTitle}. {activeSessionsPageCopy.section.emptyDescription}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
