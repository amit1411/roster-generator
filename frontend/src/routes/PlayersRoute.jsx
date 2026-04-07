import PlayersPage from "../components/PlayersPage";

export default function PlayersRoute({ players, canManagePlayers, onRequireOrganizerLogin }) {
  return (
    <PlayersPage
      players={players.directoryPlayers.map((player) => ({
        player_id: player.playerId,
        full_name: player.fullName,
        short_name: player.shortName,
        source: player.source,
        aliases: player.aliases,
        created_at: player.createdAt,
      }))}
      loading={players.playersLoading}
      canManagePlayers={canManagePlayers}
      onRequireOrganizerLogin={onRequireOrganizerLogin}
      directoryError={players.directoryError}
      createLoading={players.createPlayerLoading}
      createError={players.createPlayerError}
      updateLoading={players.updatePlayerLoading}
      updateError={players.updatePlayerError}
      deleteLoading={players.deletePlayerLoading}
      deleteError={players.deletePlayerError}
      onRefresh={players.loadPlayers}
      onClearDirectoryError={players.clearDirectoryError}
      onCreatePlayer={players.handleCreatePlayer}
      onClearCreateError={players.clearCreatePlayerError}
      onUpdatePlayer={players.handleUpdatePlayer}
      onClearUpdateError={players.clearUpdatePlayerError}
      onDeletePlayer={players.handleDeletePlayer}
      onClearDeleteError={players.clearDeletePlayerError}
    />
  );
}
