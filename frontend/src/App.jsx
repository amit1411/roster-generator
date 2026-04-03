import { useEffect, useRef, useState } from "react";
import PlayerInput from "./components/PlayerInput";
import ConfigPanel from "./components/ConfigPanel";
import RosterTable from "./components/RosterTable";
import DownloadCSV from "./components/DownloadCSV";
import ScoringPage from "./components/ScoringPage";
import ActiveSessionsPage from "./components/ActiveSessionsPage";
import HistoryPage from "./components/HistoryPage";
import PlayerStatsPage from "./components/PlayerStatsPage";
import PlayersPage from "./components/PlayersPage";
import {
  batchUpdateSharedScores,
  createPlayer,
  createSharedSession,
  deletePlayer,
  deleteSharedSession,
  editSharedRound,
  endSharedRound,
  fetchSharedSession,
  fetchPlayerStats,
  generateRoster,
  listCompletedSessions,
  listPlayers,
  listPlayerStats,
  renameSharedSession,
  listSharedSessions,
  startSharedRound,
  updatePlayer,
  updateSharedScore,
} from "./api";
import { buildKnockoutRounds, createScoresForRounds } from "./scoring";

const PLANNER_STORAGE_KEY = "badminton-roster:planner";
const SESSION_STORAGE_KEY = "badminton-roster:session";
const SESSION_ACCESS_STORAGE_KEY = "badminton-roster:session-access";
const VIEW_STORAGE_KEY = "badminton-roster:view";
const SESSION_POLL_INTERVAL_MS = 12000;
const ACTIVE_EDIT_GRACE_MS = 15000;
const PLAIN_SESSION_WAIT_LABELS = new Set([
  "Ending round...",
  "Re-opening round...",
  "Refreshing session...",
]);

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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function normalizeConfig(config) {
  return { ...DEFAULT_CONFIG, ...config };
}

function getPlannerRosterSignature(selectedPlayerIds, fixedPairIds, config, directoryPlayers) {
  const playersById = new Map(directoryPlayers.map((player) => [player.playerId, player]));
  const selectedPlayers = selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean)
    .map((player) => ({
      playerId: player.playerId,
      shortName: player.shortName,
    }));

  const normalizedPairs = fixedPairIds
    .map(([firstId, secondId]) => {
      const firstPlayer = playersById.get(firstId);
      const secondPlayer = playersById.get(secondId);
      if (!firstPlayer || !secondPlayer) return null;
      return {
        playerIds: [firstId, secondId].sort(),
        shortNames: [firstPlayer.shortName, secondPlayer.shortName].sort(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.playerIds.join("|").localeCompare(b.playerIds.join("|")));

  const normalizedConfig = {
    num_courts: config.num_courts,
    court_numbers: config.court_numbers,
    rounds: config.rounds,
    limits: Object.fromEntries(Object.entries(config.limits || {}).sort(([a], [b]) => a.localeCompare(b))),
    pair_games: config.pair_games,
    pair_start_round: config.pair_start_round,
    max_consecutive_rest: config.max_consecutive_rest,
    seed: config.seed,
    draw_type: config.draw_type,
    league_meetings: config.league_meetings,
    knockout_qualifiers: config.knockout_qualifiers,
  };

  return JSON.stringify({
    players: selectedPlayers,
    fixedPairs: normalizedPairs,
    config: normalizedConfig,
  });
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

function SessionCard({ session, isCurrent, feedback, canScore, onOpen, onCopy, onDelete, onRename }) {
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
              onClick={() => onRename(session.sessionId, session.name)}
              disabled={!canScore}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Rename
            </button>
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

function RenameSessionDialog({
  open,
  value,
  loading,
  onChange,
  onCancel,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Rename Session</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900">Update the session name</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-sm font-medium text-gray-700" htmlFor="rename-session-name">
            Session name
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {loading ? "Saving..." : "Save Name"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlannerStepCard({ step, title, description, tone = "default", children }) {
  const tones = {
    default: "border-gray-200 bg-white",
    indigo: "border-indigo-200 bg-indigo-50",
    slate: "border-slate-200 bg-slate-900 text-white",
  };

  const descriptionTone = tone === "slate" ? "text-slate-300" : "text-gray-600";
  const stepTone = tone === "slate" ? "text-slate-300" : "text-gray-500";
  const titleTone = tone === "slate" ? "text-white" : "text-gray-900";

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4">
        <p className={`text-sm font-semibold uppercase tracking-wide ${stepTone}`}>{step}</p>
        <h3 className={`mt-1 text-lg font-semibold ${titleTone}`}>{title}</h3>
        <p className={`mt-2 text-sm ${descriptionTone}`}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function PlannerModeCard({ title, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left shadow-sm transition-colors ${
        active
          ? "border-indigo-200 bg-indigo-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <p className="text-lg font-semibold text-gray-900">{title}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </button>
  );
}

function PlannerStepper({ currentStep, onStepChange }) {
  const steps = [
    { id: 1, label: "Players & Pairs" },
    { id: 2, label: "Settings" },
    { id: 3, label: "Review & Start" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isComplete = currentStep > step.id;
        const isClickable = step.id <= currentStep;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (isClickable) {
                onStepChange(step.id);
              }
            }}
            disabled={!isClickable}
            className={`rounded-xl border px-4 py-3 ${
              isActive
                ? "border-indigo-200 bg-indigo-50"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-white/15 bg-white/10"
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wide ${isActive || isComplete ? "text-gray-500" : "text-indigo-100"}`}>
              Step {step.id}
            </p>
            <p className={`mt-1 text-sm font-semibold ${isActive || isComplete ? "text-gray-900" : "text-white"}`}>{step.label}</p>
          </button>
        );
      })}
    </div>
  );
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function normalizeCompletedSessionSummary(session) {
  if (!session?.session_id) return null;

  return {
    sessionId: session.session_id,
    sessionName: session.session_name,
    drawType: session.draw_type,
    completedAt: session.completed_at,
    totalPlayers: session.total_players,
    totalMatches: session.total_matches,
    championPair: session.champion_pair || null,
    topPlayer: session.top_player || null,
  };
}

function normalizePlayerDirectoryEntry(player) {
  if (!player?.player_id) return null;

  return {
    playerId: player.player_id,
    fullName: player.full_name,
    shortName: player.short_name,
    source: player.source || "manual",
    aliases: Array.isArray(player.aliases) ? player.aliases : [],
    createdAt: player.created_at || null,
  };
}

function normalizePlayerSummary(player) {
  if (!player?.player_name) return null;

  return {
    playerId: player.player_id || null,
    fullName: player.full_name || player.player_name,
    shortName: player.short_name || player.player_name,
    playerName: player.player_name,
    sessionsPlayed: player.sessions_played,
    matchesPlayed: player.matches_played,
    wins: player.wins,
    losses: player.losses,
    draws: player.draws,
    points: player.points,
    pointDifference: player.point_difference,
    leagueMatchesPlayed: player.league_matches_played,
    leagueWins: player.league_wins,
    leagueLosses: player.league_losses,
    leagueDraws: player.league_draws,
    leaguePoints: player.league_points,
    leaguePointDifference: player.league_point_difference,
    knockoutMatchesPlayed: player.knockout_matches_played,
    knockoutWins: player.knockout_wins,
    knockoutLosses: player.knockout_losses,
    knockoutDraws: player.knockout_draws,
    knockoutPoints: player.knockout_points,
    knockoutPointDifference: player.knockout_point_difference,
    championships: player.championships,
    winRate: player.win_rate,
    lastSessionAt: player.last_session_at || null,
  };
}

function normalizePlayerDetail(detail) {
  if (!detail?.player_name) return null;

  return {
    ...normalizePlayerSummary(detail),
    topPartners: Array.isArray(detail.top_partners)
      ? detail.top_partners.map((partner) => ({
          partnerId: partner.partner_id || null,
          fullName: partner.full_name || partner.partner_name,
          shortName: partner.short_name || partner.partner_name,
          partnerName: partner.partner_name,
          matchesPlayed: partner.matches_played,
          wins: partner.wins,
          winRate: partner.win_rate,
        }))
      : [],
  };
}

export default function App() {
  const plannerState = useRef(readStorage(PLANNER_STORAGE_KEY, null)).current;
  const savedSession = useRef(readStorage(SESSION_STORAGE_KEY, null)).current;
  const savedSessionAccess = useRef(readStorage(SESSION_ACCESS_STORAGE_KEY, {})).current;
  const initialView = useRef(readStorage(VIEW_STORAGE_KEY, "planner")).current;

  const [directoryPlayers, setDirectoryPlayers] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(plannerState?.selectedPlayerIds || []);
  const [fixedPairIds, setFixedPairIds] = useState(plannerState?.fixedPairIds || []);
  const [config, setConfig] = useState(normalizeConfig(plannerState?.config));
  const [roster, setRoster] = useState(plannerState?.roster || null);
  const [rosterSignature, setRosterSignature] = useState(plannerState?.rosterSignature || null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [currentSession, setCurrentSession] = useState(normalizeSession(savedSession));
  const [view, setView] = useState(initialView);
  const [plannerMode, setPlannerMode] = useState("generate");
  const [plannerStep, setPlannerStep] = useState(1);
  const [sessionDraftName, setSessionDraftName] = useState(createSessionName());
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionAccess, setSessionAccess] = useState(savedSessionAccess);
  const [sessions, setSessions] = useState([]);
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState([]);
  const [playerStatsLoading, setPlayerStatsLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStatsDetail, setPlayerStatsDetail] = useState(null);
  const [playerStatsDetailLoading, setPlayerStatsDetailLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [createPlayerLoading, setCreatePlayerLoading] = useState(false);
  const [updatePlayerLoading, setUpdatePlayerLoading] = useState(false);
  const [deletePlayerLoading, setDeletePlayerLoading] = useState(false);
  const [playerManagementError, setPlayerManagementError] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionLoadingLabel, setSessionLoadingLabel] = useState("Syncing shared session...");
  const [sessionsLoadingLabel, setSessionsLoadingLabel] = useState("Refreshing sessions...");
  const [pendingRoundAction, setPendingRoundAction] = useState(null);
  const [renameDialog, setRenameDialog] = useState({ open: false, sessionId: null });
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState({ sessionId: null, text: "" });
  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const reviewStepRef = useRef(null);
  const pendingScoreEditsRef = useRef({});
  const scoreMutationQueueRef = useRef(Promise.resolve());
  const lastLocalEditAtRef = useRef(0);
  const previousNonScoringViewRef = useRef(initialView === "scoring" ? "sessions" : initialView);

  const playersById = new Map(directoryPlayers.map((player) => [player.playerId, player]));
  const selectedPlayers = selectedPlayerIds
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean);
  const selectedPlayerShortNames = selectedPlayers.map((player) => player.shortName);
  const fixedPairs = fixedPairIds
    .map(([firstId, secondId]) => {
      const firstPlayer = playersById.get(firstId);
      const secondPlayer = playersById.get(secondId);
      if (!firstPlayer || !secondPlayer) return null;
      return [firstPlayer.shortName, secondPlayer.shortName].sort();
    })
    .filter(Boolean);
  const plannerRosterSignature = getPlannerRosterSignature(selectedPlayerIds, fixedPairIds, config, directoryPlayers);
  const isRosterStale = Boolean(roster && rosterSignature && rosterSignature !== plannerRosterSignature);

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
    if (sessionLoading || sessionsLoading) {
      setSessionElapsed(0);
      sessionTimerRef.current = setInterval(() => setSessionElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(sessionTimerRef.current);
    }
    return () => clearInterval(sessionTimerRef.current);
  }, [sessionLoading, sessionsLoading]);

  useEffect(() => {
    writeStorage(PLANNER_STORAGE_KEY, { selectedPlayerIds, fixedPairIds, config, roster, rosterSignature });
  }, [selectedPlayerIds, fixedPairIds, config, roster, rosterSignature]);

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
    loadPlayers();
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (directoryPlayers.length === 0) return;

    if ((!plannerState?.selectedPlayerIds || plannerState.selectedPlayerIds.length === 0) && Array.isArray(plannerState?.players)) {
      const legacyIds = plannerState.players
        .map((name) => directoryPlayers.find((player) => player.shortName === name || player.fullName === name)?.playerId)
        .filter(Boolean);
      if (legacyIds.length > 0 && selectedPlayerIds.length === 0) {
        setSelectedPlayerIds(legacyIds);
      }
    }

    if ((!plannerState?.fixedPairIds || plannerState.fixedPairIds.length === 0) && Array.isArray(plannerState?.fixedPairs)) {
      const legacyPairIds = plannerState.fixedPairs
        .map(([firstName, secondName]) => {
          const firstId = directoryPlayers.find((player) => player.shortName === firstName || player.fullName === firstName)?.playerId;
          const secondId = directoryPlayers.find((player) => player.shortName === secondName || player.fullName === secondName)?.playerId;
          if (!firstId || !secondId) return null;
          return [firstId, secondId].sort();
        })
        .filter(Boolean);
      if (legacyPairIds.length > 0 && fixedPairIds.length === 0) {
        setFixedPairIds(legacyPairIds);
      }
    }
  }, [directoryPlayers, fixedPairIds.length, plannerState, selectedPlayerIds.length]);

  useEffect(() => {
    const validSelectedIds = selectedPlayerIds.filter((playerId) => playersById.has(playerId));
    if (validSelectedIds.length !== selectedPlayerIds.length) {
      setSelectedPlayerIds(validSelectedIds);
    }
  }, [directoryPlayers, selectedPlayerIds]);

  useEffect(() => {
    const selectedIdSet = new Set(selectedPlayerIds);
    const validPairs = fixedPairIds.filter(
      ([firstId, secondId]) =>
        selectedIdSet.has(firstId) &&
        selectedIdSet.has(secondId) &&
        firstId !== secondId
    );
    if (validPairs.length !== fixedPairIds.length) {
      setFixedPairIds(validPairs);
    }
  }, [fixedPairIds, selectedPlayerIds]);

  useEffect(() => {
    const selectedShortNameSet = new Set(selectedPlayers.map((player) => player.shortName));
    setConfig((current) => {
      const nextLimits = Object.fromEntries(
        Object.entries(current.limits || {}).filter(([playerName]) => selectedShortNameSet.has(playerName))
      );
      if (Object.keys(nextLimits).length === Object.keys(current.limits || {}).length) {
        return current;
      }
      return { ...current, limits: nextLimits };
    });
  }, [selectedPlayers]);

  useEffect(() => {
    if (view === "sessions") {
      loadSessions();
    }
  }, [view]);

  useEffect(() => {
    if (view === "history") {
      loadHistorySessions();
    }
  }, [view]);

  useEffect(() => {
    if (view === "player-stats") {
      loadPlayerStats();
    }
  }, [view]);

  useEffect(() => {
    const urlSession = getSessionContextFromUrl();
    if (!urlSession?.sessionId) return;

    setSessionLoadingLabel("Opening shared session...");
    setSessionLoading(true);
    fetchSharedSession(urlSession.sessionId, urlSession.editToken)
      .then((session) => {
        const normalized = mergePendingScoreEdits(normalizeSession(session), pendingScoreEditsRef.current);
        rememberSessionAccess(normalized.sessionId, normalized.editToken);
        setCurrentSession(normalized);
        previousNonScoringViewRef.current = initialView === "scoring" ? "sessions" : initialView;
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
      if (Object.keys(pendingScoreEditsRef.current).length > 0) return;
      if (Date.now() - lastLocalEditAtRef.current < ACTIVE_EDIT_GRACE_MS) return;

      try {
        const latest = mergePendingScoreEdits(
          normalizeSession(await fetchSharedSession(currentSession.sessionId, currentSession.editToken)),
          pendingScoreEditsRef.current
        );
        if (latest.version !== currentSession.version) {
          rememberSessionAccess(latest.sessionId, latest.editToken);
          setCurrentSession(latest);
        }
      } catch {
        // Keep current local state if polling fails; next successful poll will resync.
      }
    }, SESSION_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [currentSession?.editToken, currentSession?.sessionId, currentSession?.version]);

  useEffect(() => {
    if (view === "scoring" && !currentSession && !sessionLoading) {
      setView("sessions");
    }
  }, [view, currentSession, sessionLoading]);

  useEffect(() => {
    if (playerStats.length === 0) {
      if (selectedPlayer) {
        setSelectedPlayer(null);
      }
      if (playerStatsDetail) {
        setPlayerStatsDetail(null);
      }
      return;
    }

    if (!selectedPlayer || !playerStats.some((player) => player.playerName === selectedPlayer)) {
      setSelectedPlayer(playerStats[0].playerName);
    }
  }, [playerStats, selectedPlayer, playerStatsDetail]);

  useEffect(() => {
    if (view !== "player-stats" || !selectedPlayer) return;
    loadPlayerStatsDetail(selectedPlayer);
  }, [view, selectedPlayer]);

  function enqueueScoreMutation(task) {
    const nextOperation = scoreMutationQueueRef.current.then(task, task);
    scoreMutationQueueRef.current = nextOperation.catch(() => {});
    return nextOperation;
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setGenerateError(null);
    try {
      const result = await generateRoster(getLeagueRequestPayload(selectedPlayerShortNames, fixedPairs, config));
      setRoster(result);
      setRosterSignature(plannerRosterSignature);
      setPlannerStep(3);
      setView("planner");
    } catch (e) {
      setGenerateError(e.message);
      setRoster(null);
      setRosterSignature(null);
      window.setTimeout(() => {
        reviewStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } finally {
      setLoading(false);
    }
  }

  function loadingText() {
    if (elapsed < 3) return "Generating...";
    if (elapsed < 8) return `Generating... (${elapsed}s)`;
    return `Waking up server... (${elapsed}s)`;
  }

  function sessionWaitText(label) {
    if (PLAIN_SESSION_WAIT_LABELS.has(label)) return label;
    if (sessionElapsed < 3) return label;
    if (sessionElapsed < 8) return `${label} (${sessionElapsed}s)`;
    return `Waking up server... (${sessionElapsed}s)`;
  }

  function rememberSessionAccess(sessionId, editToken) {
    if (!sessionId || !editToken) return;
    setSessionAccess((current) => ({ ...current, [sessionId]: editToken }));
  }

  async function loadSessions() {
    setSessionsLoadingLabel("Refreshing session...");
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

  async function loadPlayers() {
    setPlayersLoading(true);
    try {
      const list = await listPlayers();
      setDirectoryPlayers(list.map(normalizePlayerDirectoryEntry).filter(Boolean));
    } catch (e) {
      setError((currentError) => currentError || e.message);
    } finally {
      setPlayersLoading(false);
    }
  }

  async function loadHistorySessions() {
    setHistoryLoading(true);
    try {
      const list = await listCompletedSessions();
      setHistorySessions(list.map(normalizeCompletedSessionSummary).filter(Boolean));
    } catch (e) {
      setError((currentError) => currentError || e.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadPlayerStats() {
    setPlayerStatsLoading(true);
    try {
      const list = await listPlayerStats();
      setPlayerStats(list.map(normalizePlayerSummary).filter(Boolean));
    } catch (e) {
      setError((currentError) => currentError || e.message);
    } finally {
      setPlayerStatsLoading(false);
    }
  }

  async function loadPlayerStatsDetail(playerName) {
    setPlayerStatsDetailLoading(true);
    try {
      const detail = await fetchPlayerStats(playerName);
      setPlayerStatsDetail(normalizePlayerDetail(detail));
    } catch (e) {
      setError((currentError) => currentError || e.message);
    } finally {
      setPlayerStatsDetailLoading(false);
    }
  }

  async function handleCreatePlayer(payload) {
    setCreatePlayerLoading(true);
    setPlayerManagementError(null);
    try {
      const created = await createPlayer(payload);
      const normalized = normalizePlayerDirectoryEntry(created);
      setDirectoryPlayers((current) =>
        [...current, normalized].sort((a, b) => a.fullName.localeCompare(b.fullName))
      );
      setError(null);
      return normalized;
    } catch (e) {
      setPlayerManagementError(e.message);
      return null;
    } finally {
      setCreatePlayerLoading(false);
    }
  }

  async function handleUpdatePlayer(playerId, payload) {
    setUpdatePlayerLoading(true);
    setPlayerManagementError(null);
    try {
      const updated = await updatePlayer(playerId, payload);
      const normalized = normalizePlayerDirectoryEntry(updated);
      setDirectoryPlayers((current) =>
        current
          .map((player) => (player.playerId === playerId ? normalized : player))
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
      );
      setError(null);
      void loadPlayerStats();
      return normalized;
    } catch (e) {
      setPlayerManagementError(e.message);
      return null;
    } finally {
      setUpdatePlayerLoading(false);
    }
  }

  async function handleDeletePlayer(playerId, payload) {
    setDeletePlayerLoading(true);
    setPlayerManagementError(null);
    try {
      await deletePlayer(playerId, payload);
      setDirectoryPlayers((current) => current.filter((player) => player.playerId !== playerId));
      setSelectedPlayerIds((current) => current.filter((value) => value !== playerId));
      setFixedPairIds((current) =>
        current.filter(([firstId, secondId]) => firstId !== playerId && secondId !== playerId)
      );
      void loadPlayerStats();
      setError(null);
      return true;
    } catch (e) {
      setPlayerManagementError(e.message);
      return false;
    } finally {
      setDeletePlayerLoading(false);
    }
  }

  function refreshSupportingViews({ includeHistory = false, includePlayerStats = false } = {}) {
    void loadSessions();
    if (includeHistory) {
      void loadHistorySessions();
    }
    if (includePlayerStats) {
      void loadPlayerStats();
    }
  }

  async function handleLockRoster() {
    if (!roster) return;

    setSessionLoadingLabel("Creating session...");
    setSessionLoading(true);
    setError(null);
    try {
      const session = await createSharedSession({
        name: sessionDraftName.trim() || createSessionName(),
        roster,
        draw_config: {
          draw_type: config.draw_type,
          league_meetings: config.league_meetings,
          knockout_qualifiers: config.knockout_qualifiers,
        },
        selected_players: selectedPlayers.map((player) => ({
          player_id: player.playerId,
          full_name: player.fullName,
          short_name: player.shortName,
        })),
        fixed_pair_player_ids: fixedPairIds,
      });
      const normalized = mergePendingScoreEdits(normalizeSession(session), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      setRoster(null);
      setRosterSignature(null);
      setPlannerMode("generate");
      setPlannerStep(1);
      setSessionDraftName(createSessionName());
      setSessionIdInUrl(normalized.sessionId, normalized.editToken);
      previousNonScoringViewRef.current = "sessions";
      setView("scoring");
      refreshSupportingViews();
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function openSession(sessionId) {
    setSessionLoadingLabel("Opening shared session...");
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
      setSessionIdInUrl(latest.sessionId, latest.editToken);
      previousNonScoringViewRef.current = view === "scoring" ? previousNonScoringViewRef.current : view;
      setView("scoring");
      refreshSupportingViews();
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  function handleBackToPlanner() {
    setPlannerMode("generate");
    setPlannerStep(roster ? 3 : 1);
    setView(previousNonScoringViewRef.current || "sessions");
  }

  function openRenameDialog(sessionId, currentName) {
    setRenameDialog({ open: true, sessionId });
    setRenameValue(currentName || "");
    setError(null);
  }

  function closeRenameDialog() {
    if (renameLoading) return;
    setRenameDialog({ open: false, sessionId: null });
    setRenameValue("");
  }

  async function handleRenameSession() {
    if (!renameDialog.sessionId) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      setError("Session name is required");
      return;
    }

    setRenameLoading(true);
    setSessionLoadingLabel("Renaming session...");
    setSessionLoading(true);
    try {
      const editToken =
        currentSession?.sessionId === renameDialog.sessionId
          ? currentSession.editToken
          : sessionAccess[renameDialog.sessionId] || null;
      const updated = await renameSharedSession(renameDialog.sessionId, { name: nextName }, editToken);
      const normalized = normalizeSession(updated);
      if (currentSession?.sessionId === renameDialog.sessionId) {
        setCurrentSession(normalized);
      }
      setRenameDialog({ open: false, sessionId: null });
      setRenameValue("");
      refreshSupportingViews({ includeHistory: true, includePlayerStats: true });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRenameLoading(false);
      setSessionLoading(false);
    }
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

    setSessionLoadingLabel("Deleting session...");
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
        setView("sessions");
      }
      refreshSupportingViews({ includeHistory: true, includePlayerStats: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleStartRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;
    const { sessionId, editToken } = currentSession;

    setPendingRoundAction({ stage, roundIndex, action: "start" });
    setSessionLoadingLabel(`Starting ${stage === "knockout" ? "playoff" : "league"} round...`);
    setSessionLoading(true);
    try {
      const updated = await startSharedRound(sessionId, {
        stage,
        round_index: roundIndex,
      }, editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      refreshSupportingViews({ includeHistory: true, includePlayerStats: true });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingRoundAction(null);
      setSessionLoading(false);
    }
  }

  async function handleEndRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;
    const { sessionId, editToken } = currentSession;

    setPendingRoundAction({ stage, roundIndex, action: "end" });
    setSessionLoadingLabel("Ending round...");
    setSessionLoading(true);
    try {
      await waitForNextPaint();
      await flushRoundScoreEdits(sessionId, stage, roundIndex, editToken);
      const updated = await endSharedRound(sessionId, {
        stage,
        round_index: roundIndex,
      }, editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      refreshSupportingViews({ includeHistory: true, includePlayerStats: true });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingRoundAction(null);
      setSessionLoading(false);
    }
  }

  async function handleEditRound(stage, roundIndex) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;
    const { sessionId, editToken } = currentSession;

    setPendingRoundAction({ stage, roundIndex, action: "edit" });
    setSessionLoadingLabel("Re-opening round...");
    setSessionLoading(true);
    try {
      await waitForNextPaint();
      await flushRoundScoreEdits(sessionId, stage, roundIndex, editToken);
      const updated = await editSharedRound(sessionId, {
        stage,
        round_index: roundIndex,
      }, editToken);
      const normalized = mergePendingScoreEdits(normalizeSession(updated), pendingScoreEditsRef.current);
      rememberSessionAccess(normalized.sessionId, normalized.editToken);
      setCurrentSession(normalized);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPendingRoundAction(null);
      setSessionLoading(false);
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

  async function pushScoreUpdate(sessionId, editToken, stage, roundIndex, courtIndex, teamKey, rawValue) {
    const syncKey = getScoreSyncKey(stage, roundIndex, courtIndex, teamKey);

    return enqueueScoreMutation(async () => {
      try {
        const result = await updateSharedScore(sessionId, {
          stage,
          round_index: roundIndex,
          court_index: courtIndex,
          team_key: teamKey,
          value: rawValue === "" ? null : Math.max(0, Number.parseInt(rawValue, 10) || 0),
        }, editToken || sessionAccess[sessionId] || null);
        if (pendingScoreEditsRef.current[syncKey]?.rawValue === rawValue) {
          delete pendingScoreEditsRef.current[syncKey];
        }

        setCurrentSession((current) => (current ? { ...current, version: result.version ?? current.version } : current));
        setError(null);
      } catch (e) {
        setError(e.message);
        throw e;
      }
    });
  }

  async function flushRoundScoreEdits(sessionId, stage, roundIndex, editToken) {
    const pendingEntries = Object.entries(pendingScoreEditsRef.current).filter(([, edit]) =>
      edit.stage === stage && edit.roundIndex === roundIndex
    );

    if (pendingEntries.length === 0) return;

    await enqueueScoreMutation(async () => {
      const updates = pendingEntries.map(([, edit]) => ({
        stage,
        round_index: roundIndex,
        court_index: edit.courtIndex,
        team_key: edit.teamKey,
        value: edit.rawValue === "" ? null : Math.max(0, Number.parseInt(edit.rawValue, 10) || 0),
      }));

      const result = await batchUpdateSharedScores(sessionId, {
        stage,
        round_index: roundIndex,
        updates,
      }, editToken || sessionAccess[sessionId] || null);

      pendingEntries.forEach(([syncKey, edit]) => {
        if (pendingScoreEditsRef.current[syncKey]?.rawValue === edit.rawValue) {
          delete pendingScoreEditsRef.current[syncKey];
        }
      });

      setCurrentSession((current) => (current ? { ...current, version: result.version ?? current.version } : current));
      setError(null);
    });
  }

  function handleScoreChange(stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;

    lastLocalEditAtRef.current = Date.now();
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
  }

  function handleScoreCommit(stage, roundIndex, courtIndex, teamKey, rawValue) {
    if (!currentSession?.sessionId || !currentSession.canEdit) return;
    pushScoreUpdate(currentSession.sessionId, currentSession.editToken, stage, roundIndex, courtIndex, teamKey, rawValue);
  }

  const canContinueFromPlayers = selectedPlayerIds.length >= 4;
  const canContinueFromSettings = config.num_courts >= 1;
  const activeSessions = sessions.filter((session) => session.status !== "completed");
  const navItems = [
    { key: "planner", label: "Planner" },
    { key: "players", label: "Players" },
    { key: "sessions", label: "Active Sessions" },
    { key: "history", label: "History" },
    { key: "player-stats", label: "Player Stats" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Badminton</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    previousNonScoringViewRef.current = item.key;
                    setView(item.key);
                  }}
                  className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {sessionLoading && view === "scoring" ? (
        <div className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-4 sm:top-20 sm:bottom-auto sm:w-[360px]">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-lg">
            <p className="text-sm font-medium text-blue-700">{sessionWaitText(sessionLoadingLabel)}</p>
            {sessionElapsed >= 5 && !PLAIN_SESSION_WAIT_LABELS.has(sessionLoadingLabel) ? (
              <p className="mt-2 text-sm text-blue-600">
                The backend may be waking up. This can take a little longer on cold start.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium">Error: {error}</p>
          </div>
        )}

        {sessionLoading && view !== "scoring" && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">{sessionWaitText(sessionLoadingLabel)}</p>
            {sessionElapsed >= 5 && !PLAIN_SESSION_WAIT_LABELS.has(sessionLoadingLabel) ? (
              <p className="mt-2 text-sm text-blue-600">The backend may be waking up. This can take a little longer on cold start.</p>
            ) : null}
          </div>
        )}

        {view === "planner" ? (
          <div className="space-y-8">
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-5 text-white shadow-sm sm:p-6">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-medium text-indigo-100">Planner</p>
                  <h2 className="mt-1 text-2xl font-bold">Build the next session from scratch</h2>
                  <p className="mt-2 max-w-3xl text-sm text-indigo-50">
                    Keep this page focused on setup: add players, configure the format, generate the roster, and start a new session.
                  </p>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <PlannerStepper currentStep={plannerStep} onStepChange={setPlannerStep} />
              </section>

              {plannerStep === 1 ? (
                <PlannerStepCard
                  step="Step 1"
                  title="Players and pairs"
                  description="Select players from the directory and set any fixed pairs before moving on."
                >
                  <div className="space-y-6">
                    <PlayerInput
                      availablePlayers={directoryPlayers}
                      selectedPlayerIds={selectedPlayerIds}
                      setSelectedPlayerIds={setSelectedPlayerIds}
                      fixedPairIds={fixedPairIds}
                      setFixedPairIds={setFixedPairIds}
                      onOpenPlayerManagement={() => setView("players")}
                    />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setView("sessions")}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Go to Active Sessions
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerStep(2)}
                        disabled={!canContinueFromPlayers}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Next: Settings
                      </button>
                    </div>
                  </div>
                </PlannerStepCard>
              ) : null}

              {plannerStep === 2 ? (
                <PlannerStepCard
                  step="Step 2"
                  title="Settings"
                  description="Choose the format and scheduling settings for this roster."
                >
                  <div className="space-y-6">
                    <ConfigPanel
                      config={config}
                      setConfig={setConfig}
                      players={selectedPlayerShortNames}
                      fixedPairs={fixedPairs}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setPlannerStep(1)}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlannerStep(3)}
                        disabled={!canContinueFromSettings}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Next: Review
                      </button>
                    </div>
                  </div>
                </PlannerStepCard>
              ) : null}

              {plannerStep === 3 ? (
                <div ref={reviewStepRef} className="space-y-4">
                  <PlannerStepCard
                    step="Step 3"
                    title="Review and start"
                    description="Generate the roster, review the rounds, then start the session."
                    tone={roster ? "slate" : "default"}
                  >
                    {loading ? (
                      <div className="py-8 text-center">
                        <svg className="mx-auto mb-4 h-12 w-12 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className={`${roster ? "text-slate-200" : "text-gray-700"} font-medium`}>{loadingText()}</p>
                        {elapsed >= 5 ? (
                          <p className={`mt-2 text-sm ${roster ? "text-slate-400" : "text-gray-400"}`}>
                            First request may take up to 30s while the server wakes up
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {generateError ? (
                          <div className={`rounded-xl border px-4 py-3 text-sm ${
                            roster ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}>
                            <p className="font-semibold">Roster could not be generated</p>
                            <p className="mt-1">{generateError}</p>
                          </div>
                        ) : null}
                        {isRosterStale ? (
                          <div className={`rounded-xl border px-4 py-3 text-sm ${
                            roster ? "border-amber-300 bg-amber-50 text-amber-800" : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}>
                            <p className="font-semibold">Roster is out of date</p>
                            <p className="mt-1">
                              Players, pairs, or settings changed after the last generation. Regenerate the roster before starting a session.
                            </p>
                          </div>
                        ) : null}
                        <p className={`text-sm ${roster ? "text-slate-300" : "text-gray-600"}`}>
                          {roster
                            ? isRosterStale
                              ? "The roster preview below is from older inputs and needs to be regenerated."
                              : "The latest generated roster is ready to review below."
                            : "Generate a roster to preview the rounds and courts here."}
                        </p>
                        {roster ? (
                          <label className={`block text-sm font-medium ${roster ? "text-slate-100" : "text-gray-700"}`} htmlFor="session-draft-name">
                            Session name
                            <input
                              id="session-draft-name"
                              type="text"
                              value={sessionDraftName}
                              onChange={(event) => setSessionDraftName(event.target.value)}
                              maxLength={120}
                              className={`mt-2 block w-full rounded-lg border px-3 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                                roster
                                  ? "border-slate-500/50 bg-slate-950/40 text-white placeholder:text-slate-400"
                                  : "border-gray-300 bg-white text-gray-900"
                              }`}
                            />
                          </label>
                        ) : null}
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                          <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading || selectedPlayerIds.length < 4}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            {roster ? (isRosterStale ? "Regenerate Updated Roster" : "Regenerate Roster") : "Generate Roster"}
                          </button>
                          {roster ? <DownloadCSV data={roster} /> : null}
                          <button
                            type="button"
                            onClick={handleLockRoster}
                            disabled={!roster || isRosterStale || sessionLoading}
                            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            {sessionLoading ? "Creating Session..." : isRosterStale ? "Regenerate To Start" : "Start Session"}
                          </button>
                        </div>
                        <div className="flex">
                          <button
                            type="button"
                            onClick={() => setPlannerStep(2)}
                            className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                              roster
                                ? "border-slate-500/40 bg-transparent text-white hover:bg-white/10"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}
                  </PlannerStepCard>

                  {roster ? <RosterTable data={roster} fixedPairs={fixedPairs} /> : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : view === "players" ? (
          <PlayersPage
            players={directoryPlayers.map((player) => ({
              player_id: player.playerId,
              full_name: player.fullName,
              short_name: player.shortName,
              source: player.source,
              aliases: player.aliases,
              created_at: player.createdAt,
            }))}
            loading={playersLoading}
            createLoading={createPlayerLoading}
            updateLoading={updatePlayerLoading}
            deleteLoading={deletePlayerLoading}
            error={playerManagementError}
            onRefresh={loadPlayers}
            onCreatePlayer={handleCreatePlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
          />
        ) : view === "sessions" ? (
          <ActiveSessionsPage
            sessions={activeSessions}
            currentSessionId={currentSession?.sessionId || null}
            sessionAccess={sessionAccess}
            shareFeedback={shareFeedback}
            sessionsLoading={sessionsLoading}
            sessionsLoadingLabel={sessionsLoadingLabel}
            sessionWaitText={sessionWaitText}
            onRefresh={loadSessions}
            onOpen={openSession}
            onCopy={handleCopyShareLink}
            onDelete={handleDeleteSession}
            onRename={openRenameDialog}
          />
        ) : view === "history" ? (
          <HistoryPage
            sessions={historySessions.map((session) => ({
              session_id: session.sessionId,
              session_name: session.sessionName,
              draw_type: session.drawType,
              completed_at: session.completedAt,
              total_players: session.totalPlayers,
              total_matches: session.totalMatches,
              champion_pair: session.championPair,
              top_player: session.topPlayer,
            }))}
            sessionsLoading={historyLoading}
            onRefresh={loadHistorySessions}
            onOpen={openSession}
            onDelete={handleDeleteSession}
            sessionAccess={sessionAccess}
          />
        ) : view === "player-stats" ? (
          <PlayerStatsPage
            players={playerStats.map((player) => ({
              player_id: player.playerId,
              full_name: player.fullName,
              short_name: player.shortName,
              player_name: player.playerName,
              sessions_played: player.sessionsPlayed,
              matches_played: player.matchesPlayed,
              win_rate: player.winRate,
              championships: player.championships,
            }))}
            selectedPlayer={selectedPlayer}
            playerDetail={
              playerStatsDetail
                ? {
                    player_id: playerStatsDetail.playerId,
                    full_name: playerStatsDetail.fullName,
                    short_name: playerStatsDetail.shortName,
                    player_name: playerStatsDetail.playerName,
                    sessions_played: playerStatsDetail.sessionsPlayed,
                    matches_played: playerStatsDetail.matchesPlayed,
                    win_rate: playerStatsDetail.winRate,
                    championships: playerStatsDetail.championships,
                    last_session_at: playerStatsDetail.lastSessionAt,
                    top_partners: playerStatsDetail.topPartners.map((partner) => ({
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
            loading={playerStatsLoading}
            detailLoading={playerStatsDetailLoading}
            onSelectPlayer={setSelectedPlayer}
            onRefresh={loadPlayerStats}
          />
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
            pendingRoundAction={pendingRoundAction}
            onRenameSession={() => openRenameDialog(currentSession.sessionId, currentSession.name)}
          />
        ) : null}
        <RenameSessionDialog
          open={renameDialog.open}
          value={renameValue}
          loading={renameLoading}
          onChange={setRenameValue}
          onCancel={closeRenameDialog}
          onSubmit={handleRenameSession}
        />
      </main>
    </div>
  );
}
