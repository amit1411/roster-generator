import {
  areRoundsComplete,
  buildIndividualStandings,
  buildKnockoutRounds,
  buildPairStandings,
  createScoresForRounds,
  getMatchWinner,
  isScoreComplete,
} from "../scoring";

function getRoundStatus(roundIndex, activeRound, roundScores) {
  if (roundIndex < activeRound) {
    const completed = roundScores.every(isScoreComplete);
    return completed ? "completed" : "in-progress";
  }

  if (roundIndex === activeRound) {
    return "active";
  }

  return "pending";
}

function formatPointDifference(value) {
  return value > 0 ? `+${value}` : value;
}

function StatusBadge({ status }) {
  const styles = {
    completed: "bg-green-100 text-green-700 border-green-200",
    "in-progress": "bg-amber-100 text-amber-700 border-amber-200",
    active: "bg-indigo-100 text-indigo-700 border-indigo-200",
    pending: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const labels = {
    completed: "Completed",
    "in-progress": "In Progress",
    active: "Active",
    pending: "Pending",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function RankingTable({ title, emptyText, label, standings }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {standings.length > 0 ? (
        <div className="mt-4 space-y-3 md:hidden">
          {standings.map(([name, stats]) => (
            <div key={name} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 break-words">{name}</p>
                <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {stats.points} pts
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white px-2 py-2">
                  <p className="text-gray-400">Wins</p>
                  <p className="mt-1 font-semibold text-green-700">{stats.wins}</p>
                </div>
                <div className="rounded-lg bg-white px-2 py-2">
                  <p className="text-gray-400">Losses</p>
                  <p className="mt-1 font-semibold text-rose-600">{stats.losses}</p>
                </div>
                <div className="rounded-lg bg-white px-2 py-2">
                  <p className="text-gray-400">Diff</p>
                  <p className="mt-1 font-semibold text-gray-700">{formatPointDifference(stats.pointDifference)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {standings.length > 0 ? (
        <div className="mt-4 hidden overflow-hidden rounded-xl border border-gray-200 md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">{label}</th>
                <th className="px-3 py-2 text-right font-semibold">Points</th>
                <th className="px-3 py-2 text-right font-semibold">Win</th>
                <th className="px-3 py-2 text-right font-semibold">Loss</th>
                <th className="px-3 py-2 text-right font-semibold">Point Difference</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(([name, stats]) => (
                <tr key={name} className="border-t border-gray-100 bg-white">
                  <td className="px-3 py-2 font-medium text-gray-800">{name}</td>
                  <td className="px-3 py-2 text-right font-semibold text-indigo-700">{stats.points}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{stats.wins}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-600">{stats.losses}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-700">
                    {formatPointDifference(stats.pointDifference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
      )}
    </div>
  );
}

function RoundList({
  title,
  rounds,
  scoresByRound,
  activeRound,
  stage,
  onStartRound,
  onScoreChange,
  onScoreCommit,
}) {
  if (rounds.length === 0) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{rounds.length} round{rounds.length > 1 ? "s" : ""}</p>
      </div>

      {rounds.map((round, roundIndex) => {
        const roundScores = scoresByRound[roundIndex] || createScoresForRounds([round])[0];
        const status = getRoundStatus(roundIndex, activeRound, roundScores);
        const canStart = roundIndex === activeRound + 1;

        return (
          <section
            key={`${stage}-${round.id || round.round}`}
            className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
              status === "active" ? "border-indigo-200" : "border-gray-200"
            }`}
          >
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-gray-900">{round.label || `Round ${round.round}`}</h4>
                  <StatusBadge status={status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {round.courts.length} court{round.courts.length > 1 ? "s" : ""} scheduled
                  {round.resting?.length > 0 ? ` • Resting: ${round.resting.join(", ")}` : " • No one resting"}
                </p>
              </div>
              <button
                onClick={() => onStartRound(stage, roundIndex)}
                disabled={!canStart}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                {status === "active" ? "Round Live" : status === "pending" ? "Start Round" : "Round Started"}
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              {round.courts.map((court, courtIndex) => {
                const score = roundScores[courtIndex];
                const winner = getMatchWinner(score, court);
                const inputsEnabled = roundIndex <= activeRound;

                return (
                  <div key={courtIndex} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {stage === "league" ? `Court ${round.court_numbers?.[courtIndex] ?? courtIndex + 1}` : "Match"}
                          </p>
                          <div className="mt-2 flex flex-col gap-2 text-sm text-gray-800">
                            <p className="rounded-lg bg-white px-3 py-2 font-medium shadow-sm">
                              {court.team_a.join(" & ")}
                            </p>
                            <p className="rounded-lg bg-white px-3 py-2 font-medium shadow-sm">
                              {court.team_b.join(" & ")}
                            </p>
                          </div>
                        </div>
                        {winner && (
                          <p className="text-sm font-medium text-green-700">Winner: {winner.join(" & ")}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:max-w-xs">
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Team A
                          <input
                            type="number"
                            min={0}
                            value={score.teamA}
                            disabled={!inputsEnabled}
                            onChange={(event) => onScoreChange(stage, roundIndex, courtIndex, "teamA", event.target.value)}
                            onBlur={(event) => onScoreCommit(stage, roundIndex, courtIndex, "teamA", event.target.value)}
                            className="mt-1 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-lg font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                          />
                        </label>
                        <span className="pb-3 text-center text-sm font-semibold text-gray-400">vs</span>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Team B
                          <input
                            type="number"
                            min={0}
                            value={score.teamB}
                            disabled={!inputsEnabled}
                            onChange={(event) => onScoreChange(stage, roundIndex, courtIndex, "teamB", event.target.value)}
                            onBlur={(event) => onScoreCommit(stage, roundIndex, courtIndex, "teamB", event.target.value)}
                            className="mt-1 block w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-center text-lg font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function ScoringPage({
  roster,
  drawConfig,
  sessionName,
  leagueScoresByRound,
  activeLeagueRound,
  knockoutScoresByRound,
  activeKnockoutRound,
  onBack,
  onStartRound,
  onScoreChange,
  onScoreCommit,
}) {
  const leagueRounds = roster.rounds.map((round) => ({
    ...round,
    label: `Round ${round.round}`,
    court_numbers: roster.court_numbers,
  }));

  const individualStandings = buildIndividualStandings(roster.rounds, leagueScoresByRound);
  const pairStandings = buildPairStandings(roster.rounds, leagueScoresByRound);
  const knockoutRounds = buildKnockoutRounds(drawConfig, roster, leagueScoresByRound, knockoutScoresByRound);
  const leagueComplete = areRoundsComplete(roster.rounds, leagueScoresByRound);
  const totalRounds = leagueRounds.length + knockoutRounds.length;
  const completedRounds =
    leagueRounds.filter((_, roundIndex) => (leagueScoresByRound[roundIndex] || []).every(isScoreComplete)).length +
    knockoutRounds.filter((_, roundIndex) => (knockoutScoresByRound[roundIndex] || []).every(isScoreComplete)).length;

  const nextLeagueRound =
    activeLeagueRound + 1 < leagueRounds.length ? leagueRounds[activeLeagueRound + 1].label : null;
  const nextKnockoutRound =
    activeKnockoutRound + 1 < knockoutRounds.length ? knockoutRounds[activeKnockoutRound + 1].label : null;
  const nextRoundLabel = nextLeagueRound || nextKnockoutRound;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-4 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-100">Scoring Console</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">
              {drawConfig?.draw_type === "league_knockout" ? "Run league play and playoffs" : "Run the session round by round"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-50">
              Start each round when you are ready, then enter scores court by court. When league play is complete, playoff rounds are seeded automatically from the pair table.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              Session {sessionName}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
              <p className="text-indigo-100">Progress</p>
              <p className="font-semibold text-white">{completedRounds} / {totalRounds} rounds scored</p>
            </div>
            <button
              onClick={onBack}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Back to Roster
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-8">
          <RoundList
            title="League Stage"
            rounds={leagueRounds}
            scoresByRound={leagueScoresByRound}
            activeRound={activeLeagueRound}
            stage="league"
            onStartRound={onStartRound}
            onScoreChange={onScoreChange}
            onScoreCommit={onScoreCommit}
          />

          {drawConfig?.draw_type === "league_knockout" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                <p className="text-sm font-medium text-slate-200">Playoff Stage</p>
                <h3 className="mt-1 text-lg font-semibold">
                  {leagueComplete
                    ? "League table locked. Knockout rounds are now seeded from the pair rankings."
                    : "Finish all league rounds to unlock the knockout bracket."}
                </h3>
              </div>

              {knockoutRounds.length > 0 ? (
                <RoundList
                  title="Knockout Stage"
                  rounds={knockoutRounds}
                  scoresByRound={knockoutScoresByRound}
                  activeRound={activeKnockoutRound}
                  stage="knockout"
                  onStartRound={onStartRound}
                  onScoreChange={onScoreChange}
                  onScoreCommit={onScoreCommit}
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-600">
                    {leagueComplete
                      ? "Not enough ranked pairs are available to seed the configured playoff bracket yet."
                      : "The knockout bracket will appear here after the league stage is fully scored."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Round Control</h3>
            <p className="mt-3 text-sm text-gray-600">
              League rounds unlock one by one. If your format includes playoffs, those rounds appear automatically after league scoring is complete.
            </p>
            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next round to start</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{nextRoundLabel || "All rounds started"}</p>
            </div>
          </div>

          <RankingTable
            title="Individual Rankings"
            emptyText="Individual rankings will appear once league scores are entered."
            label="Player"
            standings={individualStandings}
          />

          <RankingTable
            title="Pair Rankings"
            emptyText="Pair rankings will appear only after a pair has completed a scored league match together."
            label="Pair"
            standings={pairStandings}
          />
        </aside>
      </div>
    </div>
  );
}
