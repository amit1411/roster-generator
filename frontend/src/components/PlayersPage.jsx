import { useState } from "react";

function PlayerEditor({ title, submitLabel, draft, setDraft, loading, error, onSubmit, onCancel }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900">Player details</h3>
        <p className="mt-2 text-sm text-gray-600">
          Full name is for the directory. Short name is what shows up in the roster and scoring flow.
        </p>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading || !draft.fullName.trim() || !draft.shortName.trim()}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            {loading ? `${submitLabel}...` : submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function DeletePlayerDialog({
  player,
  open,
  loading,
  error,
  draft,
  setDraft,
  onCancel,
  onConfirm,
}) {
  if (!open || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Delete Player</p>
        <h3 className="mt-1 text-xl font-semibold text-gray-900">This action is intentionally strict</h3>
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">
            You are deleting <span className="font-bold">{player.full_name}</span> from the player directory.
          </p>
          <p className="mt-2">
            This hides the player from Planner and Player Management. Existing sessions are not removed automatically.
          </p>
          <p className="mt-2">
            If you also tick the historical option below, player analytics records will be deleted as well. Use that only if you truly want to remove the player from historical stats.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Admin token
            <input
              type="password"
              value={draft.adminToken}
              onChange={(event) => setDraft((current) => ({ ...current, adminToken: event.target.value }))}
              placeholder="Enter ADMIN_RECOVERY_TOKEN"
              className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={draft.deleteHistory}
              onChange={(event) => setDraft((current) => ({ ...current, deleteHistory: event.target.checked }))}
              className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              Also delete historical player records
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !draft.adminToken.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            {loading ? "Deleting..." : "Delete Player"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlayersPage({
  players,
  loading,
  createLoading,
  updateLoading,
  deleteLoading,
  error,
  onRefresh,
  onCreatePlayer,
  onUpdatePlayer,
  onDeletePlayer,
}) {
  const [draft, setDraft] = useState({ fullName: "", shortName: "" });
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editDraft, setEditDraft] = useState({ fullName: "", shortName: "" });
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [deleteDraft, setDeleteDraft] = useState({ adminToken: "", deleteHistory: false });

  function submitCreate() {
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

  function beginEdit(player) {
    setEditingPlayerId(player.player_id);
    setEditDraft({
      fullName: player.full_name,
      shortName: player.short_name,
    });
  }

  function submitEdit() {
    if (!editingPlayerId || !editDraft.fullName.trim() || !editDraft.shortName.trim()) return;
    onUpdatePlayer(editingPlayerId, {
      full_name: editDraft.fullName.trim(),
      short_name: editDraft.shortName.trim(),
    }).then((updated) => {
      if (updated) {
        setEditingPlayerId(null);
        setEditDraft({ fullName: "", shortName: "" });
      }
    });
  }

  function submitDelete() {
    if (!deletingPlayer || !deleteDraft.adminToken.trim()) return;
    onDeletePlayer(deletingPlayer.player_id, {
      admin_token: deleteDraft.adminToken.trim(),
      delete_history: deleteDraft.deleteHistory,
    }).then((deleted) => {
      if (deleted) {
        setDeletingPlayer(null);
        setDeleteDraft({ adminToken: "", deleteHistory: false });
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
        <div className="space-y-6">
          <PlayerEditor
            title="Add Player"
            submitLabel="Create Player"
            draft={draft}
            setDraft={setDraft}
            loading={createLoading}
            error={editingPlayerId ? null : error}
            onSubmit={submitCreate}
          />

          {editingPlayerId ? (
            <PlayerEditor
              title="Edit Player"
              submitLabel="Save Changes"
              draft={editDraft}
              setDraft={setEditDraft}
              loading={updateLoading}
              error={error}
              onSubmit={submitEdit}
              onCancel={() => {
                if (updateLoading) return;
                setEditingPlayerId(null);
                setEditDraft({ fullName: "", shortName: "" });
              }}
            />
          ) : null}
        </div>

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
                      {player.aliases?.length > 0 ? (
                        <p className="mt-3 text-xs text-gray-500">
                          Also matched from older names: {player.aliases.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => beginEdit(player)}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingPlayer(player);
                          setDeleteDraft({ adminToken: "", deleteHistory: false });
                        }}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        Delete
                      </button>
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

      <DeletePlayerDialog
        player={deletingPlayer}
        open={Boolean(deletingPlayer)}
        loading={deleteLoading}
        error={deletingPlayer ? error : null}
        draft={deleteDraft}
        setDraft={setDeleteDraft}
        onCancel={() => {
          if (deleteLoading) return;
          setDeletingPlayer(null);
          setDeleteDraft({ adminToken: "", deleteHistory: false });
        }}
        onConfirm={submitDelete}
      />
    </div>
  );
}
