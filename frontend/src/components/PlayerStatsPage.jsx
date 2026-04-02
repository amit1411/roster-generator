function MetricCard({ label, value, accent = "default" }) {
  const accents = {
    default: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatDrawType(drawType) {
  return drawType === "league_knockout" ? "League + Knockout" : "Round Robin";
}

function formatSessionTime(value) {
  if (!value) return "Unknown";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Unknown";
  }
}

function PlayerDirectory({ players, selectedPlayerId, onOpenPlayerStats }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Players</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">Open a player profile</h3>
      <div className="mt-4 space-y-2">
        {players.length > 0 ? (
          players.map((player) => (
            <button
              key={player.player_name}
              type="button"
              onClick={() => onOpenPlayerStats(player.player_name)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                selectedPlayerId === player.player_name
                  ? "border-sky-300 bg-sky-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{player.player_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {player.sessions_played} sessions • {player.matches_played} matches
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-sky-700">{player.win_rate}%</p>
                <p className="mt-1 text-xs text-slate-500">{player.wins} wins</p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            Player stats will appear here after sessions are completed.
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onBackToHistory }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
      Pick a player from the directory to open a detailed profile, or head back to History to browse completed sessions.
      <div className="mt-4">
        <button
          type="button"
          onClick={onBackToHistory}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          Back to History
        </button>
      </div>
    </div>
  );
}

export default function PlayerStatsPage({
  playerId,
  players,
  playerStatsLoading,
  playerDetail,
  playerStatsDetailLoading,
  onOpenPlayerStats,
  onOpenSession,
  onBackToHistory,
}) {
  const selectedPlayerId = playerId === "overview" ? null : playerId;
  const bestPartner = playerDetail?.partner_breakdown?.[0]?.partner_name || "No partner data yet";

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-100 via-orange-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">Player Stats</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              {playerDetail ? playerDetail.player_name : "Completed-session player records"}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              These stats are aggregated from completed sessions only, so active matches never distort the leaderboard or
              player history.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToHistory}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to History
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <PlayerDirectory
          players={players}
          selectedPlayerId={selectedPlayerId}
          onOpenPlayerStats={onOpenPlayerStats}
        />

        <div className="space-y-6">
          {playerStatsLoading && !players.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">Loading player leaderboard...</p>
            </div>
          ) : null}

          {playerStatsDetailLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">Loading player profile...</p>
            </div>
          ) : playerDetail ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Sessions Played" value={playerDetail.sessions_played} accent="sky" />
                <MetricCard label="Matches Played" value={playerDetail.matches_played} accent="default" />
                <MetricCard label="Win Rate" value={`${playerDetail.win_rate}%`} accent="emerald" />
                <MetricCard label="Best Partner" value={bestPartner} accent="amber" />
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Wins" value={playerDetail.wins} accent="emerald" />
                <MetricCard label="Losses" value={playerDetail.losses} accent="default" />
                <MetricCard label="Draws" value={playerDetail.draws} accent="default" />
                <MetricCard
                  label="Point Difference"
                  value={`${playerDetail.point_difference > 0 ? "+" : ""}${playerDetail.point_difference}`}
                  accent="sky"
                />
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Sessions</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">Completed sessions for {playerDetail.player_name}</h3>
                  <div className="mt-4 space-y-3">
                    {playerDetail.recent_sessions.length > 0 ? (
                      playerDetail.recent_sessions.map((session) => (
                        <button
                          key={`${session.session_id}-${session.completed_at}`}
                          type="button"
                          onClick={() => onOpenSession(session.session_id)}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-100"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{session.session_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDrawType(session.draw_type)} • {formatSessionTime(session.completed_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-sky-700">
                              {session.wins}W {session.losses}L
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{session.matches_played} matches</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No completed sessions recorded for this player yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Partner Breakdown</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">Who they perform best with</h3>
                  <div className="mt-4 space-y-3">
                    {playerDetail.partner_breakdown.length > 0 ? (
                      playerDetail.partner_breakdown.map((partner) => (
                        <div
                          key={partner.partner_name}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{partner.partner_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {partner.sessions_together} sessions together • {partner.matches_played} matches
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-700">{partner.win_rate}%</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {partner.wins}W {partner.losses}L
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Partner chemistry will appear after completed matches are aggregated.</p>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <EmptyState onBackToHistory={onBackToHistory} />
          )}
        </div>
      </div>
    </div>
  );
}
