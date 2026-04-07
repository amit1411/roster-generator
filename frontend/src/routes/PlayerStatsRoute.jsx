import PlayerStatsPage from "../components/PlayerStatsPage";

export default function PlayerStatsRoute({ playerStats }) {
  return (
    <PlayerStatsPage
      players={playerStats.playerStats.map((player) => ({
        player_id: player.playerId,
        full_name: player.fullName,
        short_name: player.shortName,
        player_name: player.playerName,
        sessions_played: player.sessionsPlayed,
        matches_played: player.matchesPlayed,
        win_rate: player.winRate,
        championships: player.championships,
      }))}
      selectedPlayer={playerStats.selectedPlayer}
      playerDetail={
        playerStats.playerStatsDetail
          ? {
              player_id: playerStats.playerStatsDetail.playerId,
              full_name: playerStats.playerStatsDetail.fullName,
              short_name: playerStats.playerStatsDetail.shortName,
              player_name: playerStats.playerStatsDetail.playerName,
              sessions_played: playerStats.playerStatsDetail.sessionsPlayed,
              matches_played: playerStats.playerStatsDetail.matchesPlayed,
              wins: playerStats.playerStatsDetail.wins,
              win_rate: playerStats.playerStatsDetail.winRate,
              championships: playerStats.playerStatsDetail.championships,
              last_session_at: playerStats.playerStatsDetail.lastSessionAt,
              most_played_partner: playerStats.playerStatsDetail.mostPlayedPartner
                ? {
                    partner_id: playerStats.playerStatsDetail.mostPlayedPartner.partnerId,
                    full_name: playerStats.playerStatsDetail.mostPlayedPartner.fullName,
                    short_name: playerStats.playerStatsDetail.mostPlayedPartner.shortName,
                    partner_name: playerStats.playerStatsDetail.mostPlayedPartner.partnerName,
                    matches_played: playerStats.playerStatsDetail.mostPlayedPartner.matchesPlayed,
                    wins: playerStats.playerStatsDetail.mostPlayedPartner.wins,
                    win_rate: playerStats.playerStatsDetail.mostPlayedPartner.winRate,
                  }
                : null,
              top_partners: playerStats.playerStatsDetail.topPartners.map((partner) => ({
                partner_id: partner.partnerId,
                full_name: partner.fullName,
                short_name: partner.shortName,
                partner_name: partner.partnerName,
                matches_played: partner.matchesPlayed,
                wins: partner.wins,
                win_rate: partner.winRate,
              })),
            }
          : null
      }
      loading={playerStats.playerStatsLoading}
      detailLoading={playerStats.playerStatsDetailLoading}
      onSelectPlayer={playerStats.setSelectedPlayer}
      onRefresh={playerStats.loadPlayerStats}
    />
  );
}
