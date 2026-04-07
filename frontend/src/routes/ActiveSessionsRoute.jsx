import ActiveSessionsPage from "../components/ActiveSessionsPage";

export default function ActiveSessionsRoute({
  sessions,
  canManageSessions,
  onRequireOrganizerLogin,
  sessionWaitText,
  currentSessionId,
}) {
  return (
    <ActiveSessionsPage
      sessions={sessions.activeSessions}
      canManageSessions={canManageSessions}
      currentSessionId={currentSessionId}
      sessionAccess={sessions.sessionAccess}
      shareFeedback={sessions.shareFeedback}
      sessionsLoading={sessions.sessionsLoading}
      sessionsLoadingLabel={sessions.sessionsLoadingLabel}
      sessionWaitText={sessionWaitText}
      onRefresh={sessions.loadSessions}
      onRequireOrganizerLogin={onRequireOrganizerLogin}
      onOpen={sessions.openSession}
      onCopy={sessions.handleCopyShareLink}
      onDelete={sessions.handleDeleteSession}
      onRename={sessions.openRenameDialog}
    />
  );
}
