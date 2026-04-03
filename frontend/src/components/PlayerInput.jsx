import { useMemo, useState } from "react";

function PlayerTile({ player, actionLabel, onAction, selected = false, muted = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${
        selected
          ? "border-indigo-200 bg-indigo-50"
          : muted
            ? "border-gray-200 bg-gray-50"
            : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{player.fullName}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-full bg-white/80 px-2 py-1 font-medium text-gray-600">
              {player.shortName}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1">{player.playerId}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAction(player.playerId)}
          className={`inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            selected
              ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function PlayerInput({
  availablePlayers,
  selectedPlayerIds,
  setSelectedPlayerIds,
  fixedPairIds,
  setFixedPairIds,
  onOpenPlayerManagement,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pairSelection, setPairSelection] = useState({ active: false, first: "" });

  const playersById = useMemo(
    () => new Map(availablePlayers.map((player) => [player.playerId, player])),
    [availablePlayers]
  );

  const selectedPlayers = selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean);

  const selectedIdSet = new Set(selectedPlayerIds);
  const availablePool = availablePlayers.filter((player) => !selectedIdSet.has(player.playerId));

  const filteredPlayers = availablePool.filter((player) => {
    const haystack = `${player.fullName} ${player.shortName} ${player.playerId}`.toLowerCase();
    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  function addPlayer(playerId) {
    if (selectedIdSet.has(playerId)) return;
    setSelectedPlayerIds([...selectedPlayerIds, playerId]);
  }

  function removePlayer(playerId) {
    setSelectedPlayerIds(selectedPlayerIds.filter((value) => value !== playerId));
    setFixedPairIds(
      fixedPairIds.filter(([firstId, secondId]) => firstId !== playerId && secondId !== playerId)
    );
    if (pairSelection.first === playerId) {
      setPairSelection({ active: false, first: "" });
    }
  }

  function togglePair(playerId) {
    if (!pairSelection.active) {
      setPairSelection({ active: true, first: playerId });
      return;
    }

    if (pairSelection.first === playerId) {
      setPairSelection({ active: false, first: "" });
      return;
    }

    const nextPair = [pairSelection.first, playerId].sort();
    const alreadyExists = fixedPairIds.some(
      ([firstId, secondId]) => firstId === nextPair[0] && secondId === nextPair[1]
    );

    if (alreadyExists) {
      setFixedPairIds(
        fixedPairIds.filter(
          ([firstId, secondId]) => !(firstId === nextPair[0] && secondId === nextPair[1])
        )
      );
    } else {
      const nextFixedPairs = fixedPairIds.filter(
        ([firstId, secondId]) =>
          firstId !== nextPair[0] &&
          secondId !== nextPair[0] &&
          firstId !== nextPair[1] &&
          secondId !== nextPair[1]
      );
      setFixedPairIds([...nextFixedPairs, nextPair]);
    }

    setPairSelection({ active: false, first: "" });
  }

  function removePair(index) {
    setFixedPairIds(fixedPairIds.filter((_, currentIndex) => currentIndex !== index));
  }

  function getPairPartner(playerId) {
    for (const [firstId, secondId] of fixedPairIds) {
      if (firstId === playerId) return secondId;
      if (secondId === playerId) return firstId;
    }
    return "";
  }

  const pairColors = [
    "bg-blue-100 border-blue-300",
    "bg-green-100 border-green-300",
    "bg-amber-100 border-amber-300",
    "bg-rose-100 border-rose-300",
    "bg-cyan-100 border-cyan-300",
    "bg-fuchsia-100 border-fuchsia-300",
  ];

  function getPairColor(playerId) {
    const index = fixedPairIds.findIndex(([firstId, secondId]) => firstId === playerId || secondId === playerId);
    if (index === -1) return "";
    return pairColors[index % pairColors.length];
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Session Players</h2>
              <p className="mt-1 text-sm text-gray-600">
                Pick players from the registry for this session. Using the directory avoids typos and keeps names consistent.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600">
                {selectedPlayers.length} selected
              </span>
              <button
                type="button"
                onClick={onOpenPlayerManagement}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Manage Players
              </button>
            </div>
          </div>

          {pairSelection.active ? (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              Select a partner for{" "}
              <strong>{playersById.get(pairSelection.first)?.shortName || playersById.get(pairSelection.first)?.fullName}</strong>
              {" "}or tap the same player again to cancel.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {selectedPlayers.length > 0 ? (
              selectedPlayers.map((player) => {
                const partnerId = getPairPartner(player.playerId);
                const partner = partnerId ? playersById.get(partnerId) : null;
                const isFirstSelected = pairSelection.active && pairSelection.first === player.playerId;
                const pairColor = getPairColor(player.playerId);

                return (
                  <div
                    key={player.playerId}
                    className={`rounded-2xl border p-4 shadow-sm transition-colors cursor-pointer ${
                      isFirstSelected
                        ? "border-indigo-300 bg-indigo-100 ring-2 ring-indigo-200"
                        : pairColor || "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => togglePair(player.playerId)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{player.fullName}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-white/80 px-2 py-1 font-medium text-gray-600">
                            {player.shortName}
                          </span>
                          <span className="rounded-full bg-white/80 px-2 py-1">{player.playerId}</span>
                          {partner ? (
                            <span className="rounded-full bg-white/80 px-2 py-1 font-medium text-indigo-700">
                              paired with {partner.shortName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removePlayer(player.playerId);
                        }}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                No players selected yet. Add them from the player directory on the right.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Player Directory</h2>
              <p className="mt-1 text-sm text-gray-600">
                Search by full name, short name, or player ID.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700">
              {availablePlayers.length} total
            </span>
          </div>

          <div className="mt-4">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search players..."
              className="block w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <PlayerTile
                  key={player.playerId}
                  player={player}
                  actionLabel="Add"
                  onAction={addPlayer}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                {availablePlayers.length > 0
                  ? "No players match this search."
                  : "No players in the directory yet. Create players first to build a roster."}
              </div>
            )}
          </div>
        </section>
      </div>

      {fixedPairIds.length > 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fixed Pairs</h2>
              <p className="mt-1 text-sm text-gray-600">
                Current locked partnerships for this session.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600">
              {fixedPairIds.length} pairs
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {fixedPairIds.map(([firstId, secondId], index) => {
              const firstPlayer = playersById.get(firstId);
              const secondPlayer = playersById.get(secondId);
              if (!firstPlayer || !secondPlayer) return null;

              return (
                <span
                  key={`${firstId}-${secondId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700"
                >
                  {firstPlayer.shortName} & {secondPlayer.shortName}
                  <button
                    type="button"
                    onClick={() => removePair(index)}
                    className="text-indigo-500 transition-colors hover:text-rose-600"
                    aria-label={`Remove pair ${firstPlayer.shortName} and ${secondPlayer.shortName}`}
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
