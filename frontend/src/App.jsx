import { useEffect, useRef, useState } from "react";
import PlayerInput from "./components/PlayerInput";
import ConfigPanel from "./components/ConfigPanel";
import RosterTable from "./components/RosterTable";
import DownloadCSV from "./components/DownloadCSV";
import ScoringPage from "./components/ScoringPage";
import {
  createSharedSession,
  fetchSharedSession,
  generateRoster,
  startSharedRound,
  updateSharedScore,
} from "./api";
import { buildKnockoutRounds, createScoresForRounds } from "./scoring";

const DEFAULT_PLAYERS = [
  "DG", "Hari", "Ashok", "Jitu", "Satya", "Krupa", "Kishore", "Malli",
  "Chiru", "Vivek", "Dhawan", "Avinash", "Vikram", "Marideva", "Sai",
  "Amit", "Varun", "Phani", "Bhaskar", "Sai Krishna", "Adi", "Bharat",
];

const DEFAULT_PAIRS = [
  ["DG", "Hari"],
  ["Ashok", "Jitu"],
  ["Krupa", "Satya"],
  ["Kishore", "Malli"],
  ["Chiru", "Vivek"],
  ["Avinash", "Dhawan"],
  ["Marideva", "Vikram"],
  ["Amit", "Sai"],
];

const PLANNER_STORAGE_KEY = "badminton-roster:planner";
const SESSION_STORAGE_KEY = "badminton-roster:session";
const VIEW_STORAGE_KEY = "badminton-roster:view";
const SESSION_POLL_INTERVAL_MS = 5000;
const SCORE_SYNC_DELAY_MS = 450;

const DEFAULT_CONFIG = {
  num_courts: 5,
  court_numbers: ["1", "2", "3", "4", "5"],
  rounds: 9,
  limits: { Vikram: 2, Vivek: 3 },
  pair_games: 3,
  pair_start_round: 5,
  max_consecutive_rest: 1,
  seed: null,
  draw_type: "round_robin",
  league_meetings: 1,
  knockout_qualifiers: 4,
};

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createSessionName() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const shortId = String(now.getTime()).slice(-4);
  return `${date}-${shortId}`;
}

function normalizeConfig(config) {
  return { ...DEFAULT_CONFIG, ...config };
}

function getLeagueRequestPayload(players, fixedPairs, config) {
  return {
    players,
    fixed_pairs: fixedPairs,
    num_courts: config.num_courts,
    court_numbers: config.court_numbers,
    rounds: config.rounds,
    limits: config.limits,
    pair_games: config.pair_games,
    pair_start_round: config.pair_start_round,
    max_consecutive_rest: config.max_consecutive_rest,
    seed: config.seed,
  };
}

function getSessionIdFromUrl() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("session");
}

function setSessionIdInUrl(sessionId) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (sessionId) {
    url.searchParams.set("session", sessionId);
  } else {
    url.searchParams.delete("session");
  }
  window.history.replaceState({}, "", url);
}

function buildShareUrl(sessionId) {
  if (typeof window === "undefined" || !sessionId) return "";
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  return url.toString();
}

function normalizeSession(session) {
  if (!session?.roster?.rounds) return null;

  const drawConfig = normalizeConfig(session.drawConfig || session.draw_config || {});
  const roster = session.roster;
  const leagueScoresByRound = Array.isArray(session.leagueScoresByRound)
    ? session.leagueScoresByRound
    : Array.isArray(session.league_scores_by_round)
      ? session.league_scores_by_round
      : Array.isArray(session.scoresByRound)
        ? session.scoresByRound
        : createScoresForRounds(roster.rounds);

  const knockoutScoresByRound = Array.isArray(session.knockoutScoresByRound)
    ? session.knockoutScoresByRound
    : Array.isArray(session.knockout_scores_by_round)
      ? session.knockout_scores_by_round
      : [];

  const normalized = {
    sessionId: session.sessionId || session.session_id || null,
    name: session.name || createSessionName(),
    createdAt: session.createdAt || session.created_at || new Date().toISOString(),
    roster,
    drawConfig,
    leagueScoresByRound,
    activeLeagueRound: session.activeLeagueRound ?? session.active_league_round ?? session.activeRound ?? -1,
    knockoutScoresByRound,
    activeKnockoutRound: session.activeKnockoutRound ?? session.active_knockout_round ?? -1,
    version: session.version || 1,
  };

  const knockoutRounds = buildKnockoutRounds(
    normalized.drawConfig,
    normalized.roster,
    normalized.leagueScoresByRound,
    normalized.knockoutScoresByRound
  );

  return {
    ...normalized,
    knockoutScoresByRound: knockoutRounds.map((round, roundIndex) => {
      const existingScores = normalized.knockoutScoresByRound[roundIndex];
      return existingScores && existingScores.length === round.courts.length
        ? existingScores
        : createScoresForRounds([round])[0];
    }),
    activeKnockoutRound:
      normalized.activeKnockoutRound > knockoutRounds.length - 1
        ? knockoutRounds.length - 1
        : normalized.activeKnockoutRound,
  };
}

export default function App() {
  const plannerState = readStorage(PLANNER_STORAGE_KEY, null);
  const savedSession = readStorage(SESSION_STORAGE_KEY, null);
  const initialView = readStorage(VIEW_STORAGE_KEY, "planner");

  const [players, setPlayers] = useState(plannerState?.players || DEFAULT_PLAYERS);
  const [fixedPairs, setFixedPairs] = useState(plannerState?.fixedPairs || DEFAULT_PAIRS);
  const [config, setConfig] = useState(normalizeConfig(plannerState?.config));
  const [roster, setRoster] = useState(plannerState?.roster || null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [currentSession, setCurrentSession] = useState(normalizeSession(savedSession));
  const [view, setView] = useState(initialView);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const timerRef = useRef(null);
  const scoreSyncTimeoutsRef = useRef({});

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  useEffect(() => {
    writeStorage(PLANNER_STORAGE_KEY, { players, fixedPairs, config, roster });
  }, [players, fixedPairs, config, roster]);

  useEffect(() => {
    if (currentSession) {
      writeStorage(SESSION_STORAGE_KEY, currentSession);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentSession]);

  useEffect(() => {
    writeStorage(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    const urlSessionId = getSessionIdFromUrl();
    if (!urlSessionId) return;

    setSessionLoading(true);
    fetchSharedSession(urlSessionId)
      .then((session) => {
        const normalized = normalizeSession(session);
        setCurrentSession(normalized);
        setRoster(normalized.roster);
        setView("scoring");
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    if (!currentSession?.sessionId) return;

    const intervalId = window.setInterval(async () => {
      try {
        const latest = normalizeSession(await fetchSharedSession(currentSession.sessionId));
        if (latest.version !== currentSession.version) {
          setCurrentSession(latest);
          setRoster(latest.roster);
        }
      } catch {
        // Keep current local state if polling fails; next successful poll will resync.
      }
    }, SESSION_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [currentSession?.sessionId, currentSession?.version]);

  useEffect(() => {
    if (view === "scoring" && !currentSession && !sessionLoading) {
      setView("planner");
    }
  }, [view, currentSession, sessionLoading]);

  useEffect(() => {
    const pendingTimeouts = scoreSyncTimeoutsRef.current;
    return () => {
      Object.values(pendingTimeouts).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateRoster(getLeagueRequestPayload(players, fixedPairs, config));
      setRoster(result);
      setView("planner");
    } catch (e) {
      setError(e.message);
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }

  function loadingText() {
    if (elapsed < 3) return "Generating...";
    if (elapsed < 8) return `Generating... (${elapsed}s)`;
    return `Waking up server... (${elapsed}s)`;
  }

  async function handleLockRoster() {
    if (!roster) return;

    setSessionLoading(true);
    setError(null);
    try {
      const session = await createSharedSession({
        name: createSessionName(),
        roster,
        draw_config: {
          draw_type: config.draw_type,
          league_meetings: config.league_meetings,
          knockout_qualifiers: config.knockout_qualifiers,
        },
      });
      const normalized = normalizeSession(session);
      setCurrentSession(normalized);
      setSessionIdInUrl(normalized.sessionId);
      setView("scoring");
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleResumeSession() {
    if (!currentSession?.sessionId) return;

    setSessionLoading(true);
    setError(null);
    try {
      const latest = normalizeSession(await fetchSharedSession(currentSession.sessionId));
      setCurrentSession(latest);
      setRoster(latest.roster);
      setSessionIdInUrl(latest.sessionId);
      setView("scoring");
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  function handleBackToPlanner() {
    setView("planner");
  }

  async function handleCopyShareLink() {
    if (!currentSession?.sessionId) return;

    const shareUrl = buildShareUrl(currentSession.sessionId);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("Link copied");
      window.setTimeout(() => setShareFeedback(""), 2000);
    } catch {
      setShareFeedback("Copy failed");
      window.setTimeout(() => setShareFeedback(""), 2000);
    }
  }

  async function handleStartRound(stage, roundIndex) {
    if (!currentSession?.sessionId) return;

    try {
      const updated = await startSharedRound(currentSession.sessionId, {
        stage,
        round_index: roundIndex,
      });
      const normalized = normalizeSession(updated);
      setCurrentSession(normalized);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  function applyLocalScoreChange(session, stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!session) return session;

    const scoresKey = stage === "league" ? "leagueScoresByRound" : "knockoutScoresByRound";

    return normalizeSession({
      ...session,
      [scoresKey]: session[scoresKey].map((roundScores, currentRoundIndex) => {
        if (currentRoundIndex !== roundIndex) return roundScores;

        return roundScores.map((courtScore, currentCourtIndex) => {
          if (currentCourtIndex !== courtIndex) return courtScore;
          return { ...courtScore, [teamKey]: rawValue };
        });
      }),
    });
  }

  async function pushScoreUpdate(sessionId, stage, roundIndex, courtIndex, teamKey, rawValue) {
    try {
      const updated = await updateSharedScore(sessionId, {
        stage,
        round_index: roundIndex,
        court_index: courtIndex,
        team_key: teamKey,
        value: rawValue === "" ? null : Math.max(0, Number.parseInt(rawValue, 10) || 0),
      });
      const normalized = normalizeSession(updated);
      setCurrentSession(normalized);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  function getScoreSyncKey(stage, roundIndex, courtIndex, teamKey) {
    return `${stage}:${roundIndex}:${courtIndex}:${teamKey}`;
  }

  function scheduleScoreSync(sessionId, stage, roundIndex, courtIndex, teamKey, rawValue, immediate = false) {
    const syncKey = getScoreSyncKey(stage, roundIndex, courtIndex, teamKey);
    const existingTimeout = scoreSyncTimeoutsRef.current[syncKey];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
      delete scoreSyncTimeoutsRef.current[syncKey];
    }

    if (immediate) {
      pushScoreUpdate(sessionId, stage, roundIndex, courtIndex, teamKey, rawValue);
      return;
    }

    scoreSyncTimeoutsRef.current[syncKey] = window.setTimeout(() => {
      delete scoreSyncTimeoutsRef.current[syncKey];
      pushScoreUpdate(sessionId, stage, roundIndex, courtIndex, teamKey, rawValue);
    }, SCORE_SYNC_DELAY_MS);
  }

  function handleScoreChange(stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!currentSession?.sessionId) return;

    setCurrentSession((current) =>
      applyLocalScoreChange(current, stage, roundIndex, courtIndex, teamKey, rawValue)
    );
    scheduleScoreSync(currentSession.sessionId, stage, roundIndex, courtIndex, teamKey, rawValue);
  }

  function handleScoreCommit(stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!currentSession?.sessionId) return;
    scheduleScoreSync(currentSession.sessionId, stage, roundIndex, courtIndex, teamKey, rawValue, true);
  }

  const downloadData = currentSession?.roster || roster;
  const sessionShareUrl = currentSession?.sessionId ? buildShareUrl(currentSession.sessionId) : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Badminton Roster</h1>
            <p className="text-sm text-gray-500">
              {view === "planner" ? "Generate balanced doubles matchups" : "Start rounds and record scores"}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {downloadData && <DownloadCSV data={downloadData} />}
            {currentSession?.sessionId && (
              <button
                onClick={handleCopyShareLink}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {shareFeedback || "Copy Share Link"}
              </button>
            )}
            {view === "planner" && currentSession?.sessionId && (
              <button
                onClick={handleResumeSession}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Resume {currentSession.name}
              </button>
            )}
            {view === "planner" ? (
              <button
                onClick={handleGenerate}
                disabled={loading || players.length < 4}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? loadingText() : roster ? "Regenerate Roster" : "Generate Roster"}
              </button>
            ) : (
              <button
                onClick={handleBackToPlanner}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Edit Roster
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        {sessionLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Syncing shared session...</p>
          </div>
        )}

        {view === "planner" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1 space-y-6">
              <PlayerInput
                players={players}
                setPlayers={setPlayers}
                fixedPairs={fixedPairs}
                setFixedPairs={setFixedPairs}
              />
              <ConfigPanel
                config={config}
                setConfig={setConfig}
                players={players}
                fixedPairs={fixedPairs}
              />
            </div>
            <div className="lg:col-span-2">
              {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-gray-700 font-medium">{loadingText()}</p>
                  {elapsed >= 5 && (
                    <p className="text-gray-400 text-sm mt-2">
                      First request may take up to 30s while the server wakes up
                    </p>
                  )}
                </div>
              ) : roster ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-200">Roster Ready</p>
                        <h2 className="mt-1 text-lg font-semibold">Lock this draw into a shared scoring session.</h2>
                      </div>
                      <button
                        onClick={handleLockRoster}
                        disabled={sessionLoading}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
                      >
                        {sessionLoading ? "Creating Session..." : "Lock Roster and Start Session"}
                      </button>
                    </div>
                  </div>
                  {currentSession?.sessionId && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Shared Session: {currentSession.name}</p>
                          <p className="text-sm text-emerald-700">
                            Share this session across devices so others can score from their own phones.
                          </p>
                          <p className="mt-1 text-xs text-emerald-700 break-all">{sessionShareUrl}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={handleCopyShareLink}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                          >
                            {shareFeedback || "Copy Link"}
                          </button>
                          <button
                            onClick={handleResumeSession}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                          >
                            Continue Session
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <RosterTable data={roster} fixedPairs={fixedPairs} />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-gray-300 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No roster generated yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Configure players and settings, then click "Generate Roster"
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : currentSession ? (
          <ScoringPage
            roster={currentSession.roster}
            drawConfig={currentSession.drawConfig}
            sessionName={currentSession.name}
            leagueScoresByRound={currentSession.leagueScoresByRound}
            activeLeagueRound={currentSession.activeLeagueRound}
            knockoutScoresByRound={currentSession.knockoutScoresByRound}
            activeKnockoutRound={currentSession.activeKnockoutRound}
            onBack={handleBackToPlanner}
            onStartRound={handleStartRound}
            onScoreChange={handleScoreChange}
            onScoreCommit={handleScoreCommit}
          />
        ) : null}
      </main>
    </div>
  );
}
