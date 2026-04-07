import { useEffect, useState } from "react";
import { matchPath, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthDialog from "./components/AuthDialog";
import { appCopy } from "./content/uiCopy";
import PlannerRoute from "./routes/PlannerRoute";
import PlayersRoute from "./routes/PlayersRoute";
import ActiveSessionsRoute from "./routes/ActiveSessionsRoute";
import HistoryRoute from "./routes/HistoryRoute";
import PlayerStatsRoute from "./routes/PlayerStatsRoute";
import ProfileRoute from "./routes/ProfileRoute";
import ScoringRoute from "./routes/ScoringRoute";
import useSessionTiming from "./hooks/useSessionTiming";
import usePlayerStatsData from "./hooks/usePlayerStatsData";
import usePlayersData from "./hooks/usePlayersData";
import usePlannerState from "./hooks/usePlannerState";
import useSessionsData from "./hooks/useSessionsData";
import useScoringSession from "./hooks/useScoringSession";
import useAuth from "./hooks/useAuth";
import {
  PLAIN_SESSION_WAIT_LABELS,
  ROUTE_PATHS,
  buildSessionPath,
  getLegacySessionContext,
  getRoutePathForView,
  getViewFromPathname,
} from "./hooks/appStateUtils";

function RootRouteRedirect() {
  const location = useLocation();
  const legacySession = getLegacySessionContext(location.search);

  if (legacySession?.sessionId) {
    return <Navigate to={buildSessionPath(legacySession.sessionId, legacySession.editToken)} replace />;
  }

  return <Navigate to={ROUTE_PATHS.planner} replace />;
}

function RenameSessionDialog({
  open,
  value,
  loading,
  error,
  onChange,
  onCancel,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{appCopy.renameDialog.eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900">{appCopy.renameDialog.title}</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <label className="block text-sm font-medium text-gray-700" htmlFor="rename-session-name">
            {appCopy.renameDialog.fieldLabel}
            <input
              id="rename-session-name"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={loading}
              maxLength={120}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-100"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {appCopy.renameDialog.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {loading ? appCopy.renameDialog.submitLoading : appCopy.renameDialog.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const auth = useAuth();
  const hasOrganizerWorkspace = Boolean(auth.isOrganizer && auth.activeWorkspace?.workspace_id);

  const view = getViewFromPathname(location.pathname);
  const scoringRouteMatch = matchPath({ path: ROUTE_PATHS.scoring, end: true }, location.pathname);
  const routeSessionId = scoringRouteMatch?.params?.sessionId || null;
  const routeEditToken = new URLSearchParams(location.search).get("edit");
  const hideGlobalHeader = !auth.currentUser && view === "planner";

  const playerStats = usePlayerStatsData({ enabled: hasOrganizerWorkspace, view });
  const players = usePlayersData({
    enabled: hasOrganizerWorkspace,
    onPlayerDeleted: () => {},
    refreshPlayerStats: playerStats.loadPlayerStats,
  });
  const planner = usePlannerState({
    directoryPlayers: players.directoryPlayers,
    navigateToPlanner: () => navigate(ROUTE_PATHS.planner),
  });
  const sessions = useSessionsData({
    enabled: hasOrganizerWorkspace,
    navigate,
    refreshPlayerStats: playerStats.loadPlayerStats,
    view,
  });
  const scoring = useScoringSession({
    location,
    navigate,
    routeEditToken,
    routeSessionId,
    sessionAccess: sessions.sessionAccess,
    rememberSessionAccess: sessions.rememberSessionAccess,
    view,
    refreshSupportingViews: sessions.refreshSupportingViews,
  });

  const appError = scoring.pageError || sessions.pageError || playerStats.pageError || null;

  const sessionLoading = scoring.sessionLoading || sessions.sessionMutationLoading;
  const sessionLoadingLabel = scoring.sessionLoading ? scoring.sessionLoadingLabel : sessions.sessionMutationLabel;
  const timing = useSessionTiming({
    loading: planner.loading,
    sessionLoading,
    sessionsLoading: sessions.sessionsLoading,
  });

  useEffect(() => {
    setMobileNavOpen(false);
    sessions.clearPageError();
    scoring.clearPageError();
    playerStats.clearPageError();
  }, [location.pathname]);

  function navigateToView(nextView) {
    navigate(getRoutePathForView(nextView));
    setMobileNavOpen(false);
  }

  function handleAuthSuccess(user) {
    if (!user) return null;
    navigate(ROUTE_PATHS.planner);
    setMobileNavOpen(false);
    sessions.clearPageError();
    scoring.clearPageError();
    playerStats.clearPageError();
    return user;
  }

  async function handleOpenSession(sessionId) {
    await scoring.openSession(sessionId, sessions.sessionAccess[sessionId] || null, location.pathname + location.search);
  }

  async function handleDeleteSession(sessionId) {
    const deleted = await sessions.handleDeleteSession(sessionId, scoring.currentSession);
    if (deleted && scoring.currentSession?.sessionId === sessionId) {
      scoring.setCurrentSession(null);
    }
  }

  async function handleRenameSession() {
    const updated = await sessions.handleRenameSession(scoring.currentSession);
    if (updated && scoring.currentSession?.sessionId === updated.sessionId) {
      scoring.setCurrentSession(updated);
    }
  }

  async function handleLockRoster() {
    if (!auth.currentUser) {
      auth.openAuthDialog("login");
      return;
    }

    if (!hasOrganizerWorkspace) {
      auth.setAuthError("Organizer access with an active workspace is required to start a session.");
      auth.openAuthDialog("login");
      return;
    }

    const startedSession = await sessions.handleLockRoster(planner);
    if (!startedSession) return;

    scoring.setCurrentSession(startedSession);
    planner.resetAfterSessionStart();
    scoring.setPreviousNonScoringPath(ROUTE_PATHS.sessions);
    navigate(buildSessionPath(startedSession.sessionId, startedSession.editToken));
  }

  function handleRequireOrganizerLogin() {
    if (!auth.currentUser) {
      auth.openAuthDialog("login");
      return;
    }
    if (!hasOrganizerWorkspace) {
      auth.setAuthError("This account is signed in, but it does not have organizer workspace access.");
      auth.openAuthDialog("login");
    }
  }

  function handleBackToPlanner() {
    planner.setPlannerStep(planner.roster ? 3 : 1);
    navigate(scoring.getPreviousNonScoringPath());
  }

  const navItems = [
    { key: "planner", label: "Planner", icon: "planner", path: ROUTE_PATHS.planner },
  ];
  if (auth.currentUser) {
    navItems.splice(1, 0, { key: "players", label: "Players", icon: "players", path: ROUTE_PATHS.players });
    navItems.splice(2, 0, { key: "sessions", label: "Active Sessions", icon: "sessions", path: ROUTE_PATHS.sessions });
    navItems.push({ key: "history", label: "History", icon: "history", path: ROUTE_PATHS.history });
    navItems.push({ key: "player-stats", label: "Player Stats", icon: "stats", path: ROUTE_PATHS.playerStats });
  }

  const sessionsRoute = {
    ...sessions,
    openSession: handleOpenSession,
    handleDeleteSession,
  };

  const scoringRoute = {
    ...scoring,
    handleBackToPlanner,
    openRenameDialog: sessions.openRenameDialog,
  };

  return (
    <AppShell
      view={view}
      currentSessionName={scoring.currentSession?.name || null}
      currentUser={auth.currentUser}
      isOrganizer={hasOrganizerWorkspace}
      activeWorkspace={auth.activeWorkspace}
      authLoading={auth.authLoading}
      onOpenAuth={auth.openAuthDialog}
      onLogout={auth.handleLogout}
      mobileNavOpen={mobileNavOpen}
      onToggleMobileNav={() => setMobileNavOpen((current) => !current)}
      onCloseMobileNav={() => setMobileNavOpen(false)}
      onNavigate={navigateToView}
      onHome={() => {
        navigate(ROUTE_PATHS.planner);
        planner.setPlannerStep(1);
        sessions.clearPageError();
        scoring.clearPageError();
        playerStats.clearPageError();
        planner.clearPlannerError();
        setMobileNavOpen(false);
      }}
      navItems={navItems}
      hideHeader={hideGlobalHeader}
    >
      {sessionLoading && view === "scoring" ? (
        <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-[360px]">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-lg">
            <p className="text-sm font-medium text-blue-700">{timing.sessionWaitText(sessionLoadingLabel)}</p>
            {timing.sessionElapsed >= 5 && !PLAIN_SESSION_WAIT_LABELS.has(sessionLoadingLabel) ? (
              <p className="mt-2 text-sm text-blue-600">
                The backend may be waking up. This can take a little longer on cold start.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <AuthDialog
        open={auth.authDialogOpen}
        mode={auth.authMode}
        loading={auth.authLoading}
        error={auth.authError}
        googleClientId={auth.googleClientId}
        onClose={auth.closeAuthDialog}
        onModeChange={auth.setAuthMode}
        onLogin={async (payload) => handleAuthSuccess(await auth.handleLogin(payload))}
        onSignup={async (payload) => handleAuthSuccess(await auth.handleSignup(payload))}
        onGoogleCredential={async (credential) => handleAuthSuccess(await auth.handleGoogleLogin(credential))}
      />

      {appError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-800">{appCopy.errors.bannerTitle}</p>
              <p className="mt-1 text-sm font-medium text-red-700">{appError}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                sessions.clearPageError();
                scoring.clearPageError();
                playerStats.clearPageError();
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              {appCopy.errors.dismiss}
            </button>
          </div>
        </div>
      ) : null}

      {sessionLoading && view !== "scoring" ? (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">{timing.sessionWaitText(sessionLoadingLabel)}</p>
          {timing.sessionElapsed >= 5 && !PLAIN_SESSION_WAIT_LABELS.has(sessionLoadingLabel) ? (
            <p className="mt-2 text-sm text-blue-600">The backend may be waking up. This can take a little longer on cold start.</p>
          ) : null}
        </div>
      ) : null}

      <Routes>
        <Route path={ROUTE_PATHS.root} element={<RootRouteRedirect />} />
        <Route
          path={ROUTE_PATHS.planner}
          element={
            <PlannerRoute
              planner={{
                ...planner,
                directoryPlayers: players.directoryPlayers,
              }}
              canPlan={hasOrganizerWorkspace}
              currentUser={auth.currentUser}
              activeWorkspace={auth.activeWorkspace}
              onRequireOrganizerLogin={handleRequireOrganizerLogin}
              navigateToView={navigateToView}
              sessionLoading={sessionLoading}
              onLockRoster={handleLockRoster}
              timing={timing}
            />
          }
        />
        <Route
          path={ROUTE_PATHS.players}
          element={
            hasOrganizerWorkspace ? (
              <PlayersRoute
                players={players}
                canManagePlayers={hasOrganizerWorkspace}
                onRequireOrganizerLogin={handleRequireOrganizerLogin}
              />
            ) : (
              <Navigate to={ROUTE_PATHS.planner} replace />
            )
          }
        />
        <Route
          path={ROUTE_PATHS.sessions}
          element={
            hasOrganizerWorkspace ? (
              <ActiveSessionsRoute
                sessions={sessionsRoute}
                canManageSessions={hasOrganizerWorkspace}
                onRequireOrganizerLogin={handleRequireOrganizerLogin}
                sessionWaitText={timing.sessionWaitText}
                currentSessionId={scoring.currentSession?.sessionId || null}
              />
            ) : (
              <Navigate to={ROUTE_PATHS.planner} replace />
            )
          }
        />
        <Route
          path={ROUTE_PATHS.history}
          element={hasOrganizerWorkspace ? <HistoryRoute history={sessions} sessions={sessionsRoute} /> : <Navigate to={ROUTE_PATHS.planner} replace />}
        />
        <Route
          path={ROUTE_PATHS.profile}
          element={hasOrganizerWorkspace ? <ProfileRoute auth={auth} /> : <Navigate to={ROUTE_PATHS.planner} replace />}
        />
        <Route
          path={ROUTE_PATHS.playerStats}
          element={hasOrganizerWorkspace ? <PlayerStatsRoute playerStats={playerStats} /> : <Navigate to={ROUTE_PATHS.planner} replace />}
        />
        <Route path={ROUTE_PATHS.scoring} element={<ScoringRoute scoring={scoringRoute} />} />
      </Routes>

      <RenameSessionDialog
        open={sessions.renameDialog.open}
        value={sessions.renameValue}
        loading={sessions.renameLoading}
        error={sessions.renameError}
        onChange={(value) => {
          sessions.setRenameValue(value);
          if (sessions.renameError) {
            sessions.clearRenameError();
          }
        }}
        onCancel={sessions.closeRenameDialog}
        onSubmit={handleRenameSession}
      />
    </AppShell>
  );
}
