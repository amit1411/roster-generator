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
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Roster</h2>
          <span className="text-sm text-gray-500">
            {rounds.length} rounds &middot; {rounds[0]?.courts.length} courts
          </span>
        </div>
        <div className="overflow-x-auto">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Rest Distribution
          </h3>
          <div className="space-y-1.5">
            {Object.entries(rest_counts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([player, rested]) => {
                const played = rounds.length - rested;
                return (
                  <div key={player} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{player}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 font-medium">Played {played}</span>
                      <span className="text-gray-400">Rested {rested}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="space-y-4">
          {Object.keys(fixed_pair_counts).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Fixed Pair Games
              </h3>
              <div className="space-y-1.5">
                {Object.entries(fixed_pair_counts)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([pair, count]) => (
                    <div key={pair} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{pair}</span>
                      <span className="font-medium text-indigo-600">{count} games</span>
                    </div>
                  ))}
              </div>
            </div>
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
