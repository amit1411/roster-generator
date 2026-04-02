function MetricCard({ label, value, tone = "default" }) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value) {
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

export default function PlayerStatsPage({
  players,
  selectedPlayer,
  playerDetail,
  loading,
  detailLoading,
  onSelectPlayer,
  onRefresh,
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-violet-50">Player Stats</p>
        <h2 className="mt-1 text-2xl font-bold">League and knockout performance in one place</h2>
        <p className="mt-2 max-w-3xl text-sm text-indigo-50">
          Browse all-time player results from completed sessions, with a simpler summary of activity, titles, and strongest partnerships.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Players</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Leaderboard</h3>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {players.length > 0 ? (
              players.map((player) => (
                <button
                  key={player.player_name}
                  type="button"
                  onClick={() => onSelectPlayer(player.player_name)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedPlayer === player.player_name
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{player.player_name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {player.sessions_played} sessions • {player.matches_played} matches
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-700">{player.win_rate}%</p>
                      <p className="mt-1 text-xs text-gray-500">{player.championships} titles</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                Player stats will appear here after completed sessions are available.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          {detailLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">Loading player details...</p>
            </div>
          ) : playerDetail ? (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">{playerDetail.player_name}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Last completed session: {playerDetail.last_session_at ? formatDate(playerDetail.last_session_at) : "No completed sessions yet"}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Sessions" value={playerDetail.sessions_played} tone="indigo" />
                <MetricCard label="Matches" value={playerDetail.matches_played} tone="default" />
                <MetricCard label="Win Rate" value={`${playerDetail.win_rate}%`} tone="emerald" />
                <MetricCard label="Championships" value={playerDetail.championships} tone="amber" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Top Partners</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Best-performing partners for {playerDetail.player_name}</h3>
                <div className="mt-4 space-y-3">
                  {playerDetail.top_partners.length > 0 ? (
                    playerDetail.top_partners.map((partner, index) => (
                      <div key={`${partner.partner_name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{partner.partner_name}</p>
                            <p className="mt-2 text-sm text-gray-600">
                              {partner.matches_played} matches together • {partner.wins} wins
                            </p>
                          </div>
                          <div className="rounded-full bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700">
                            {partner.win_rate}% win rate
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                      Not enough completed matches yet to rank partners.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
              Select a player to view their historical league and knockout statistics.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
