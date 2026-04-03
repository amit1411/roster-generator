import { useState } from "react";

export default function PlayersPage({ players, loading, createLoading, error, onRefresh, onCreatePlayer }) {
  const [draft, setDraft] = useState({ fullName: "", shortName: "" });

  function submit(event) {
    event.preventDefault();
    if (!draft.fullName.trim() || !draft.shortName.trim()) return;
    onCreatePlayer({
      full_name: draft.fullName.trim(),
      short_name: draft.shortName.trim(),
    }).then((created) => {
      if (created) {
        setDraft({ fullName: "", shortName: "" });
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-500 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-cyan-50">Players</p>
        <h2 className="mt-1 text-2xl font-bold">Build a clean player directory once</h2>
        <p className="mt-2 max-w-3xl text-sm text-sky-50">
          Register full names and short names here, then reuse them in Planner without retyping. This reduces typos and gives every player a stable ID.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Add Player</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">Create a directory entry</h3>
            <p className="mt-2 text-sm text-gray-600">
              Keep the short name concise because that is what shows up inside the generated roster and scoring flow.
            </p>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
              <input
                type="text"
                value={draft.fullName}
                onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Arijit Mukherjee"
                className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Short Name
              <input
                type="text"
                value={draft.shortName}
                onChange={(event) => setDraft((current) => ({ ...current, shortName: event.target.value }))}
                placeholder="Arijit"
                className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={createLoading || !draft.fullName.trim() || !draft.shortName.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {createLoading ? "Creating Player..." : "Create Player"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Directory</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">Registered players</h3>
              <p className="mt-2 text-sm text-gray-600">
                Existing session and analytics names are imported automatically, so the directory can start with legacy players already filled in.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Players"}
            </button>
          </div>

          <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            {players.length > 0 ? (
              players.map((player) => (
                <div key={player.player_id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{player.full_name}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-white px-2 py-1 font-medium text-gray-700">
                          {player.short_name}
                        </span>
                        <span className="rounded-full bg-gray-200 px-2 py-1">{player.player_id}</span>
                        <span className="rounded-full bg-gray-200 px-2 py-1 capitalize">{player.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                No players yet. Add the first player from the form on the left.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
