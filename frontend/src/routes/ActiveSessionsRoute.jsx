import ActiveSessionsPage from "../components/ActiveSessionsPage";

export default function ActiveSessionsRoute({ sessions, sessionWaitText, currentSessionId }) {
  return (
    <ActiveSessionsPage
      sessions={sessions.activeSessions}
      currentSessionId={currentSessionId}
      sessionAccess={sessions.sessionAccess}
      shareFeedback={sessions.shareFeedback}
      sessionsLoading={sessions.sessionsLoading}
      sessionsLoadingLabel={sessions.sessionsLoadingLabel}
      sessionWaitText={sessionWaitText}
      onRefresh={sessions.loadSessions}
      onOpen={sessions.openSession}
      onCopy={sessions.handleCopyShareLink}
      onDelete={sessions.handleDeleteSession}
      onRename={sessions.openRenameDialog}
    />
  );
}
