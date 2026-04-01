import { useState } from "react";

export default function PlayerInput({ players, setPlayers, fixedPairs, setFixedPairs }) {
  const [name, setName] = useState("");
  const [pairSelection, setPairSelection] = useState({ active: false, first: null });

  function addPlayer(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || players.includes(trimmed)) return;
    setPlayers([...players, trimmed]);
    setName("");
  }

  function removePlayer(p) {
    setPlayers(players.filter((x) => x !== p));
    setFixedPairs(fixedPairs.filter(([a, b]) => a !== p && b !== p));
    if (pairSelection.first === p) setPairSelection({ active: false, first: null });
  }

  function togglePairMode(player) {
    if (!pairSelection.active) {
      setPairSelection({ active: true, first: player });
      return;
    }
    if (pairSelection.first === player) {
      setPairSelection({ active: false, first: null });
      return;
    }
    const newPair = [pairSelection.first, player].sort();
    const already = fixedPairs.some(
      ([a, b]) => a === newPair[0] && b === newPair[1]
    );
    if (already) {
      setFixedPairs(fixedPairs.filter(([a, b]) => !(a === newPair[0] && b === newPair[1])));
    } else {
      setFixedPairs([...fixedPairs, newPair]);
    }
    setPairSelection({ active: false, first: null });
  }

  function getPairPartner(player) {
    for (const [a, b] of fixedPairs) {
      if (a === player) return b;
      if (b === player) return a;
    }
    return null;
  }

  const pairColors = [
    "bg-blue-100 border-blue-400",
    "bg-green-100 border-green-400",
    "bg-purple-100 border-purple-400",
    "bg-amber-100 border-amber-400",
    "bg-pink-100 border-pink-400",
    "bg-cyan-100 border-cyan-400",
    "bg-rose-100 border-rose-400",
    "bg-teal-100 border-teal-400",
  ];

  function getPairColor(player) {
    const idx = fixedPairs.findIndex(([a, b]) => a === player || b === player);
    if (idx === -1) return "";
    return pairColors[idx % pairColors.length];
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Players</h2>
        <span className="w-fit rounded-full bg-gray-100 px-2.5 py-0.5 text-sm text-gray-500">
          {players.length} players
        </span>
      </div>

      <form onSubmit={addPlayer} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add player name..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Add
        </button>
      </form>

      {pairSelection.active && (
        <div className="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
          Select a partner for <strong>{pairSelection.first}</strong> or click them again to cancel
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {players.map((p) => {
          const partner = getPairPartner(p);
          const colorClass = getPairColor(p);
          const isFirstSelected = pairSelection.active && pairSelection.first === p;

          return (
            <div
              key={p}
              className={`flex flex-col gap-2 rounded-lg border px-3 py-3 text-sm transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between
                ${isFirstSelected ? "bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300" : colorClass || "border-gray-200 hover:bg-gray-50"}`}
              onClick={() => togglePairMode(p)}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-medium text-gray-800">{p}</span>
                {partner && (
                  <span className="text-xs text-gray-500 bg-white/70 px-1.5 py-0.5 rounded">
                    paired with {partner}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePlayer(p);
                }}
                className="self-end p-1 text-gray-400 transition-colors hover:text-red-500 sm:self-auto"
                title="Remove player"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {fixedPairs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Fixed Pairs</p>
          <div className="flex flex-wrap gap-2">
            {fixedPairs.map(([a, b], i) => (
              <span
                key={`${a}-${b}`}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${pairColors[i % pairColors.length]}`}
              >
                <span className="truncate">{a} & {b}</span>
                <button
                  onClick={() => setFixedPairs(fixedPairs.filter((_, j) => j !== i))}
                  className="hover:text-red-600 ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Click a player to start pairing, then click their partner. Click a paired player to unpair.
      </p>
    </div>
  );
}
