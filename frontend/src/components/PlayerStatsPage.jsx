import { useEffect, useRef } from "react";

import { playerStatsPageCopy } from "../content/uiCopy";

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

function StatsIcon({ kind, className = "h-5 w-5" }) {
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

  switch (kind) {
    case "leaderboard":
      return (
        <svg {...props}>
          <path d="M5 18.5h14" />
          <path d="M7.5 16V11.5" />
          <path d="M12 16V8.5" />
          <path d="M16.5 16V6" />
        </svg>
      );
    case "profile":
      return (
        <svg {...props}>
          <path d="M12 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "partners":
      return (
        <svg {...props}>
          <path d="M8.5 8.5a2.5 2.5 0 1 0-3.5 3.5l2 2a2.5 2.5 0 0 0 3.5 0l1.5-1.5" />
          <path d="M15.5 15.5a2.5 2.5 0 1 0 3.5-3.5l-2-2a2.5 2.5 0 0 0-3.5 0L12 11.5" />
        </svg>
      );
    default:
      return null;
  }
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm">
        <StatsIcon kind={icon} />
      </div>
      <p className="mt-4 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
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
  const detailSectionRef = useRef(null);
  const shouldScrollToDetailRef = useRef(false);

  useEffect(() => {
    if (!shouldScrollToDetailRef.current || detailLoading) {
      return;
    }

    if (!window.matchMedia("(max-width: 1279px)").matches) {
      shouldScrollToDetailRef.current = false;
      return;
    }

    detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    shouldScrollToDetailRef.current = false;
  }, [selectedPlayer, detailLoading, playerDetail]);

  const handleSelectPlayer = (playerName) => {
    shouldScrollToDetailRef.current = true;
    onSelectPlayer(playerName);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-violet-50">{playerStatsPageCopy.hero.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold">{playerStatsPageCopy.hero.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-indigo-50">
          {playerStatsPageCopy.hero.description}
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{playerStatsPageCopy.leaderboard.eyebrow}</p>
              <div className="mt-1 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <StatsIcon kind="leaderboard" />
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{playerStatsPageCopy.leaderboard.title}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? playerStatsPageCopy.leaderboard.refreshLoading : playerStatsPageCopy.leaderboard.refresh}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {players.length > 0 ? (
              players.map((player) => (
                <button
                  key={player.player_name}
                  type="button"
                  onClick={() => handleSelectPlayer(player.player_name)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedPlayer === player.player_name
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{player.full_name || player.player_name}</p>
                      {player.short_name && player.short_name !== (player.full_name || player.player_name) ? (
                        <p className="mt-1 text-xs font-medium text-indigo-700">{player.short_name}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-500">
                        {player.sessions_played} {playerStatsPageCopy.leaderboard.sessionsSuffix} • {player.matches_played} {playerStatsPageCopy.leaderboard.matchesSuffix}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-indigo-700">{player.win_rate}%</p>
                      <p className="mt-1 text-xs text-gray-500">{player.championships} {playerStatsPageCopy.leaderboard.titlesSuffix}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState
                icon="leaderboard"
                title={playerStatsPageCopy.leaderboard.emptyTitle}
                description={playerStatsPageCopy.leaderboard.emptyDescription}
              />
            )}
          </div>
        </section>

        <section ref={detailSectionRef} className="space-y-6">
          {detailLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">{playerStatsPageCopy.profile.loading}</p>
            </div>
          ) : playerDetail ? (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{playerStatsPageCopy.profile.eyebrow}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <StatsIcon kind="profile" className="h-5 w-5" />
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900">{playerDetail.full_name || playerDetail.player_name}</h3>
                </div>
                {playerDetail.short_name && playerDetail.short_name !== (playerDetail.full_name || playerDetail.player_name) ? (
                  <p className="mt-2 text-sm font-medium text-indigo-700">{playerDetail.short_name}</p>
                ) : null}
                <p className="mt-2 text-sm text-gray-600">
                  {playerStatsPageCopy.profile.lastSessionPrefix} {playerDetail.last_session_at ? formatDate(playerDetail.last_session_at) : playerStatsPageCopy.profile.noSessions}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={playerStatsPageCopy.metrics.sessions} value={playerDetail.sessions_played} tone="indigo" />
                <MetricCard label={playerStatsPageCopy.metrics.matches} value={playerDetail.matches_played} tone="default" />
                <MetricCard label={playerStatsPageCopy.metrics.winRate} value={`${playerDetail.win_rate}%`} tone="emerald" />
                <MetricCard label={playerStatsPageCopy.metrics.championships} value={playerDetail.championships} tone="amber" />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{playerStatsPageCopy.partners.eyebrow}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <StatsIcon kind="partners" />
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900">{playerStatsPageCopy.partners.titlePrefix} {playerDetail.full_name || playerDetail.player_name}</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {playerDetail.top_partners.length > 0 ? (
                    playerDetail.top_partners.map((partner, index) => (
                      <div key={`${partner.partner_name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{partner.full_name || partner.partner_name}</p>
                            {partner.short_name && partner.short_name !== (partner.full_name || partner.partner_name) ? (
                              <p className="mt-1 text-xs font-medium text-indigo-700">{partner.short_name}</p>
                            ) : null}
                            <p className="mt-2 text-sm text-gray-600">
                              {partner.matches_played} {playerStatsPageCopy.partners.matchesTogetherSuffix} • {partner.wins} {playerStatsPageCopy.partners.winsSuffix}
                            </p>
                          </div>
                          <div className="rounded-full bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700">
                            {partner.win_rate}% {playerStatsPageCopy.partners.winRateSuffix}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon="partners"
                      title={playerStatsPageCopy.partners.emptyTitle}
                      description={playerStatsPageCopy.partners.emptyDescription}
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon="profile"
              title={playerStatsPageCopy.profile.emptyTitle}
              description={playerStatsPageCopy.profile.emptyDescription}
            />
          )}
        </section>
      </div>
    </div>
  );
}
