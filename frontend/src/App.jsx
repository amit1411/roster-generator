import { useEffect, useRef, useState } from "react";
import PlayerInput from "./components/PlayerInput";
import ConfigPanel from "./components/ConfigPanel";
import RosterTable from "./components/RosterTable";
import DownloadCSV from "./components/DownloadCSV";
import ScoringPage from "./components/ScoringPage";
import {
  createSharedSession,
  deleteSharedSession,
  editSharedRound,
  endSharedRound,
  fetchSharedSession,
  generateRoster,
  listSharedSessions,
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
const SESSION_ACCESS_STORAGE_KEY = "badminton-roster:session-access";
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

function getSessionContextFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");
  if (!sessionId) return null;

  return {
    sessionId,
    editToken: params.get("edit"),
  };
}

function setSessionIdInUrl(sessionId, editToken = null) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (sessionId) {
    url.searchParams.set("session", sessionId);
  } else {
    url.searchParams.delete("session");
  }
  if (editToken) {
    url.searchParams.set("edit", editToken);
  } else {
    url.searchParams.delete("edit");
  }
  window.history.replaceState({}, "", url);
}

function buildShareUrl(sessionId, editToken = null) {
  if (typeof window === "undefined" || !sessionId) return "";
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  if (editToken) {
    url.searchParams.set("edit", editToken);
  } else {
    url.searchParams.delete("edit");
  }
  return url.toString();
}

function formatSessionTime(value) {
  if (!value) return "Just now";

  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Just now";
  }
}

function normalizeSessionSummary(session) {
  if (!session?.session_id && !session?.sessionId) return null;

  return {
    sessionId: session.sessionId || session.session_id,
    name: session.name || createSessionName(),
    createdAt: session.createdAt || session.created_at || null,
    updatedAt: session.updatedAt || session.updated_at || null,
    drawType: session.drawType || session.draw_type || "round_robin",
    status: session.status || "ready",
    endedRounds: session.endedRounds ?? session.ended_rounds ?? 0,
    totalRounds: session.totalRounds ?? session.total_rounds ?? 0,
    liveRounds: session.liveRounds ?? session.live_rounds ?? 0,
  };
}

function formatDrawType(drawType) {
  return drawType === "league_knockout" ? "League + Knockout" : "Round Robin";
}

function formatSessionStatus(session) {
  if (session.status === "completed") return "Completed";
  if (session.liveRounds > 0) return `${session.liveRounds} round${session.liveRounds > 1 ? "s" : ""} live`;
  if (session.status === "in_progress") return "In Progress";
  return "Ready";
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
    endedLeagueRounds: Array.isArray(session.endedLeagueRounds)
      ? session.endedLeagueRounds
      : Array.isArray(session.ended_league_rounds)
        ? session.ended_league_rounds
        : roster.rounds.map(() => false),
    knockoutScoresByRound,
    activeKnockoutRound: session.activeKnockoutRound ?? session.active_knockout_round ?? -1,
    endedKnockoutRounds: Array.isArray(session.endedKnockoutRounds)
      ? session.endedKnockoutRounds
      : Array.isArray(session.ended_knockout_rounds)
        ? session.ended_knockout_rounds
        : [],
    canEdit: session.canEdit ?? session.can_edit ?? false,
    editToken: session.editToken || session.edit_token || null,
    version: session.version || 1,
  };

  const knockoutRounds = buildKnockoutRounds(
    normalized.drawConfig,
    normalized.roster,
    normalized.leagueScoresByRound,
    normalized.knockoutScoresByRound,
    normalized.endedLeagueRounds,
    normalized.endedKnockoutRounds
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

function getScoreSyncKey(stage, roundIndex, courtIndex, teamKey) {
  return `${stage}:${roundIndex}:${courtIndex}:${teamKey}`;
}

function mergePendingScoreEdits(session, pendingEdits) {
  if (!session) return session;

  let nextSession = session;
  Object.values(pendingEdits).forEach((edit) => {
    const scoresKey = edit.stage === "league" ? "leagueScoresByRound" : "knockoutScoresByRound";
    if (!nextSession[scoresKey]?.[edit.roundIndex]?.[edit.courtIndex]) return;

    nextSession = normalizeSession({
      ...nextSession,
      [scoresKey]: nextSession[scoresKey].map((roundScores, currentRoundIndex) => {
        if (currentRoundIndex !== edit.roundIndex) return roundScores;

        return roundScores.map((courtScore, currentCourtIndex) => {
          if (currentCourtIndex !== edit.courtIndex) return courtScore;
          return { ...courtScore, [edit.teamKey]: edit.rawValue };
        });
      }),
    });
  });

  return nextSession;
}

function SessionCard({ session, isCurrent, feedback, canScore, onOpen, onCopy, onDelete }) {
  const statusTone =
    session.status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : session.liveRounds > 0
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{session.name}</h3>
            {isCurrent && session.status !== "completed" ? (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                Current
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}>
              {formatSessionStatus(session)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{formatDrawType(session.drawType)}</p>
          <p className="mt-2 text-sm text-gray-500">
            {session.endedRounds} / {session.totalRounds || "?"} rounds ended
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            {canScore ? "Scorer access available on this device" : "View-only link available"}
          </p>
          <p className="mt-1 text-xs text-gray-400">Updated {formatSessionTime(session.updatedAt)}</p>
        </div>

        <div className="flex flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          <button
            onClick={() => onOpen(session.sessionId)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {canScore ? "Open Scorer View" : "Open View Link"}
          </button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => onCopy(session.sessionId, "view")}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              {feedback?.mode === "view" ? feedback.text : "Copy View"}
            </button>
            <button
              onClick={() => onCopy(session.sessionId, "scorer")}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {feedback?.mode === "scorer" ? feedback.text : "Copy Scorer"}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onDelete(session.sessionId)}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const plannerState = readStorage(PLANNER_STORAGE_KEY, null);
  const savedSession = readStorage(SESSION_STORAGE_KEY, null);
  const savedSessionAccess = readStorage(SESSION_ACCESS_STORAGE_KEY, {});
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
  const [sessionAccess, setSessionAccess] = useState(savedSessionAccess);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState({ sessionId: null, text: "" });
  const timerRef = useRef(null);
  const scoreSyncTimeoutsRef = useRef({});
  const pendingScoreEditsRef = useRef({});
  const scoreMutationQueueRef = useRef(Promise.resolve());

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
    writeStorage(SESSION_ACCESS_STORAGE_KEY, sessionAccess);
  }, [sessionAccess]);

  useEffect(() => {
    writeStorage(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (view === "planner") {
      loadSessions();
    }
  }, [view]);

  useEffect(() => {
    const urlSession = getSessionContextFromUrl();
    if (!urlSession?.sessionId) return;

    setSessionLoading(true);
    fetchSharedSession(urlSession.sessionId, urlSession.editToken)
      .then((session) => {
        const normalized = mergePendingScoreEdits(normalizeSession(session), pendingScoreEditsRef.current);
        rememberSessionAccess(normalized.sessionId, normalized.editToken);
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
        const latest = mergePendingScoreEdits(
          normalizeSession(await fetchSharedSession(currentSession.sessionId, currentSession.editToken)),
          pendingScoreEditsRef.current
        );
        if (latest.version !== currentSession.version) {
          rememberSessionAccess(latest.sessionId, latest.editToken);
          setCurrentSession(latest);
          setRoster(latest.roster);
        }
      } catch {
        // Keep current local state if polling fails; next successful poll will resync.
      }
    }, SESSION_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [currentSession?.editToken, currentSession?.sessionId, currentSession?.version]);

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

  function enqueueScoreMutation(task) {
    const nextOperation = scoreMutationQueueRef.current.then(task, task);
    scoreMutationQueueRef.current = nextOperation.catch(() => {});
    return nextOperation;
  }

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

  function rememberSessionAccess(sessionId, editToken) {
    if (!sessionId || !editToken) return;
    setSessionAccess((current) => ({ ...current, [sessionId]: editToken }));
  }

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const list = await listSharedSessions();
      setSessions(list.map(normalizeSessionSummary).filter(Boolean));
    } catch (e) {
      setError((currentError) => currentError || e.message);
    } finally {
      setSessionsLoading(false);
    }
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
      const normalized = mergePendingScoreEdits(normalizeSession(session), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      setSessionIdInUrl(normalized.sessionId, normalized.editToken);
      setView("scoring");
      await loadSessions();
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function openSession(sessionId) {
    setSessionLoading(true);
    setError(null);
    try {
      const editToken = sessionAccess[sessionId] || null;
      const latest = mergePendingScoreEdits(
        normalizeSession(await fetchSharedSession(sessionId, editToken)),
        pendingScoreEditsRef.current
      );
      rememberSessionAccess(latest.sessionId, latest.editToken);
      setCurrentSession(latest);
      setRoster(latest.roster);
      setSessionIdInUrl(latest.sessionId, latest.editToken);
      setView("scoring");
      await loadSessions();
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  function handleBackToPlanner() {
    setView("planner");
  }

  async function handleCopyShareLink(sessionId, mode = "view") {
    if (!sessionId) return;

    const shareUrl = buildShareUrl(sessionId, mode === "scorer" ? sessionAccess[sessionId] || null : null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback({ sessionId, mode, text: "Copied" });
      window.setTimeout(() => setShareFeedback({ sessionId: null, text: "" }), 2000);
    } catch {
      setShareFeedback({ sessionId, mode, text: "Failed" });
      window.setTimeout(() => setShareFeedback({ sessionId: null, text: "" }), 2000);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const target = sessions.find((session) => session.sessionId === sessionId);
    const shouldDelete = window.confirm(
      `Delete ${target?.name || "this session"}? This removes the locked roster and all saved scores.`
    );
    if (!shouldDelete) return;

    setSessionLoading(true);
    setError(null);
    try {
      await deleteSharedSession(sessionId, sessionAccess[sessionId] || null);
      setSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      setSessionAccess((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      if (currentSession?.sessionId === sessionId) {
        setCurrentSession(null);
        setSessionIdInUrl(null);
        setView("planner");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleStartRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;

    try {
      const updated = await startSharedRound(currentSession.sessionId, {
        stage,
        round_index: roundIndex,
      }, currentSession.editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleEndRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;

    try {
      await flushRoundScoreEdits(currentSession.sessionId, stage, roundIndex);
      const updated = await endSharedRound(currentSession.sessionId, {
        stage,
        round_index: roundIndex,
      }, currentSession.editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleEditRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;

    try {
      await flushRoundScoreEdits(currentSession.sessionId, stage, roundIndex);
      const updated = await editSharedRound(currentSession.sessionId, {
        stage,
        round_index: roundIndex,
      }, currentSession.editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
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
    const syncKey = getScoreSyncKey(stage, roundIndex, courtIndex, teamKey);

    return enqueueScoreMutation(async () => {
      try {
        const updated = await updateSharedScore(sessionId, {
          stage,
          round_index: roundIndex,
          court_index: courtIndex,
          team_key: teamKey,
          value: rawValue === "" ? null : Math.max(0, Number.parseInt(rawValue, 10) || 0),
        }, currentSession?.editToken || sessionAccess[sessionId] || null);
        if (pendingScoreEditsRef.current[syncKey]?.rawValue === rawValue) {
          delete pendingScoreEditsRef.current[syncKey];
        }

        const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
        rememberSessionAccess(normalized.sessionId, normalized.editToken);
        setCurrentSession(normalized);
        setError(null);
      } catch (e) {
        setError(e.message);
        throw e;
      }
    });
  }

  async function flushRoundScoreEdits(sessionId, stage, roundIndex) {
    const pendingEntries = Object.entries(pendingScoreEditsRef.current).filter(([, edit]) =>
      edit.stage === stage && edit.roundIndex === roundIndex
    );

    pendingEntries.forEach(([syncKey]) => {
      const existingTimeout = scoreSyncTimeoutsRef.current[syncKey];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
        delete scoreSyncTimeoutsRef.current[syncKey];
      }
    });

    for (const [, edit] of pendingEntries) {
      await pushScoreUpdate(sessionId, stage, roundIndex, edit.courtIndex, edit.teamKey, edit.rawValue);
    }
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
    if (!currentSession?.sessionId || !currentSession.canEdit) return;

    pendingScoreEditsRef.current[getScoreSyncKey(stage, roundIndex, courtIndex, teamKey)] = {
      stage,
      roundIndex,
      courtIndex,
      teamKey,
      rawValue,
    };
    setCurrentSession((current) =>
      applyLocalScoreChange(current, stage, roundIndex, courtIndex, teamKey, rawValue)
    );
    scheduleScoreSync(currentSession.sessionId, stage, roundIndex, courtIndex, teamKey, rawValue);
  }

  function handleScoreCommit(stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;
    scheduleScoreSync(currentSession.sessionId, stage, roundIndex, courtIndex, teamKey, rawValue, true);
  }

  const downloadData = view === "planner" ? roster : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Badminton</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {downloadData ? <DownloadCSV data={downloadData} /> : null}
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
            ) : null}
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
          <div className="space-y-8">
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-5 text-white shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-100">Create New Session</p>
                  <h2 className="mt-1 text-2xl font-bold">Build the next badminton draw in a clear step-by-step flow</h2>
                  <p className="mt-2 max-w-3xl text-sm text-indigo-50">
                    Set players and format first, generate the roster when it looks right, then lock it into a shared scoring session.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Step 1</p>
                    <p className="mt-1 text-sm font-semibold text-white">Players & Format</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Step 2</p>
                    <p className="mt-1 text-sm font-semibold text-white">Generate & Review</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Step 3</p>
                    <p className="mt-1 text-sm font-semibold text-white">Start Session</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(0,1.55fr)]">
              <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Step 1</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">Configure the draw</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Keep this column focused on setup. Once the roster is generated, the review panel on the right becomes the next step.
                    </p>
                  </div>
                  <div className="space-y-6">
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
                </div>
              </div>

              <div>
                {loading ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
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
                    <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">Step 2</p>
                          <h3 className="mt-1 text-lg font-semibold">Generated roster is ready to review</h3>
                          <p className="mt-2 text-sm text-slate-300">
                            Review the schedule below. If everything looks good, lock it into a shared session.
                          </p>
                        </div>
                        <button
                          onClick={handleLockRoster}
                          disabled={sessionLoading}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:opacity-60"
                        >
                          {sessionLoading ? "Creating Session..." : "Step 3: Lock Roster and Start Session"}
                        </button>
                      </div>
                    </div>
                    <RosterTable data={roster} fixedPairs={fixedPairs} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
                    <div className="text-gray-300 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Step 2</p>
                    <p className="mt-2 text-gray-700 font-medium">Generate a roster to review it here</p>
                    <p className="text-gray-400 text-sm mt-1">
                      This panel stays focused on the output, so creation and management do not compete for attention.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Existing Sessions</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">Resume, share, or clean up saved sessions</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Session management stays below the creation flow so it is available when needed without crowding the generator.
                  </p>
                </div>
                <button
                  onClick={loadSessions}
                  disabled={sessionsLoading}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {sessionsLoading ? "Refreshing..." : "Refresh Sessions"}
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <SessionCard
                      key={session.sessionId}
                      session={session}
                      isCurrent={session.sessionId === currentSession?.sessionId}
                      canScore={Boolean(sessionAccess[session.sessionId])}
                      feedback={shareFeedback.sessionId === session.sessionId ? shareFeedback : null}
                      onOpen={openSession}
                      onCopy={handleCopyShareLink}
                      onDelete={handleDeleteSession}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
                    No shared sessions yet. Generate and lock a roster to create your first one.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : currentSession ? (
          <ScoringPage
            key={currentSession.sessionId || "scoring-session"}
            roster={currentSession.roster}
            drawConfig={currentSession.drawConfig}
            sessionName={currentSession.name}
            canEdit={currentSession.canEdit}
            leagueScoresByRound={currentSession.leagueScoresByRound}
            activeLeagueRound={currentSession.activeLeagueRound}
            endedLeagueRounds={currentSession.endedLeagueRounds}
            knockoutScoresByRound={currentSession.knockoutScoresByRound}
            activeKnockoutRound={currentSession.activeKnockoutRound}
            endedKnockoutRounds={currentSession.endedKnockoutRounds}
            onBack={handleBackToPlanner}
            onEditRound={handleEditRound}
            onStartRound={handleStartRound}
            onEndRound={handleEndRound}
            onScoreChange={handleScoreChange}
            onScoreCommit={handleScoreCommit}
          />
        ) : null}
      </main>
    </div>
  );
}
