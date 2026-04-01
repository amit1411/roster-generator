export default function RosterTable({ data, fixedPairs }) {
  if (!data) return null;

  const { rounds, court_numbers, rest_counts, fixed_pair_counts, violations, warnings } = data;

  const fixedPairSet = new Set(fixedPairs.map(([a, b]) => [a, b].sort().join("|")));

  function isFixedPairTeam(team) {
    if (team.length !== 2) return false;
    const key = [...team].sort().join("|");
    return fixedPairSet.has(key);
  }

  const maxResting = Math.max(...rounds.map((r) => r.resting.length), 0);

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700">{w}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 sm:px-5 border-b border-gray-100 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Roster</h2>
          <span className="text-sm text-gray-500">
            {rounds.length} rounds &middot; {rounds[0]?.courts.length} courts
          </span>
        </div>
        <div className="block lg:hidden p-4 space-y-4">
          {rounds.map((round) => (
            <details
              key={round.round}
              className="rounded-xl border border-gray-200 bg-gray-50"
              open={round.round === 1}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-gray-900">Round {round.round}</h3>
                <span className="text-xs font-medium text-gray-500">
                  {round.courts.length} courts{round.resting.length > 0 ? ` • ${round.resting.length} resting` : ""}
                </span>
              </summary>

              <div className="border-t border-gray-200 px-4 py-4">
                <div className="space-y-3">
                  {round.courts.map((court, ci) => {
                    const pairA = isFixedPairTeam(court.team_a);
                    const pairB = isFixedPairTeam(court.team_b);

                    return (
                      <div key={`${round.round}-${ci}`} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                          <span>Court {court_numbers?.[ci] ?? ci + 1}</span>
                          {pairA || pairB ? <span className="text-indigo-600">Fixed Pair Match</span> : null}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className={`rounded-lg px-3 py-2 text-sm ${pairA ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-gray-50 text-gray-800"}`}>
                            {court.team_a.join(" & ")}
                          </div>
                          <div className={`rounded-lg px-3 py-2 text-sm ${pairB ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-gray-50 text-gray-800"}`}>
                            {court.team_b.join(" & ")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {round.resting.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Resting</p>
                    <p className="mt-1 text-sm text-amber-900">{round.resting.join(", ")}</p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-semibold">Round</th>
                <th className="px-3 py-2.5 text-left font-semibold">Court</th>
                <th className="px-3 py-2.5 text-left font-semibold">Team A - P1</th>
                <th className="px-3 py-2.5 text-left font-semibold">Team A - P2</th>
                <th className="px-3 py-2.5 text-left font-semibold">Team B - P1</th>
                <th className="px-3 py-2.5 text-left font-semibold">Team B - P2</th>
                {Array.from({ length: maxResting }, (_, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-semibold">Rest {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) =>
                round.courts.map((court, ci) => {
                  const isFirstCourt = ci === 0;
                  const pairA = isFixedPairTeam(court.team_a);
                  const pairB = isFixedPairTeam(court.team_b);

                  return (
                    <tr
                      key={`${round.round}-${ci}`}
                      className={`border-t border-gray-100 ${isFirstCourt ? "border-t-gray-300" : ""} hover:bg-gray-50`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {isFirstCourt ? round.round : ""}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{court_numbers?.[ci] ?? ci + 1}</td>
                      <td className={`px-3 py-2 ${pairA ? "text-indigo-700 font-semibold" : "text-gray-800"}`}>
                        {court.team_a[0]}
                      </td>
                      <td className={`px-3 py-2 ${pairA ? "text-indigo-700 font-semibold" : "text-gray-800"}`}>
                        {court.team_a[1]}
                      </td>
                      <td className={`px-3 py-2 ${pairB ? "text-indigo-700 font-semibold" : "text-gray-800"}`}>
                        {court.team_b[0]}
                      </td>
                      <td className={`px-3 py-2 ${pairB ? "text-indigo-700 font-semibold" : "text-gray-800"}`}>
                        {court.team_b[1]}
                      </td>
                      {Array.from({ length: maxResting }, (_, ri) => (
                        <td key={ri} className="px-3 py-2 text-gray-400">
                          {isFirstCourt ? (round.resting[ri] || "") : ""}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rest Distribution</h3>
          </summary>
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="space-y-1.5">
              {Object.entries(rest_counts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([player, rested]) => {
                  const played = rounds.length - rested;
                  return (
                    <div key={player} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                      <span className="text-gray-700 break-words">{player}</span>
                      <div className="flex shrink-0 gap-3 text-xs">
                        <span className="text-green-600 font-medium">Played {played}</span>
                        <span className="text-gray-400">Rested {rested}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </details>

        <div className="space-y-4">
          {Object.keys(fixed_pair_counts).length > 0 && (
            <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Fixed Pair Games</h3>
              </summary>
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="space-y-1.5">
                  {Object.entries(fixed_pair_counts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([pair, count]) => (
                      <div key={pair} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between">
                        <span className="text-gray-700 break-words">{pair}</span>
                        <span className="shrink-0 font-medium text-indigo-600">{count} games</span>
                      </div>
                    ))}
                </div>
              </div>
            </details>
          )}

          {violations.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2">
                Constraint Violations
              </h3>
              {violations.map((v, i) => (
                <p key={i} className="text-sm text-red-600">{v}</p>
              ))}
            </div>
          )}

          {violations.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <p className="text-sm font-medium text-green-700">All constraints satisfied.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
