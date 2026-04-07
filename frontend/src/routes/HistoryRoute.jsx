import HistoryPage from "../components/HistoryPage";

export default function HistoryRoute({ history, sessions }) {
  return (
    <HistoryPage
      sessions={history.historySessions.map((session) => ({
        session_id: session.sessionId,
        session_name: session.sessionName,
        draw_type: session.drawType,
        completed_at: session.completedAt,
        total_players: session.totalPlayers,
        total_matches: session.totalMatches,
        champion_pair: session.championPair,
        top_player: session.topPlayer,
      }))}
      sessionsLoading={history.historyLoading}
      onRefresh={history.loadHistorySessions}
      onOpen={sessions.openSession}
      onDelete={sessions.handleDeleteSession}
      sessionAccess={sessions.sessionAccess}
    />
  );
}
