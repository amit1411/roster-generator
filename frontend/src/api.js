function getDefaultApiBase() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const currentUrl = new URL(window.location.origin);
  const hostname = currentUrl.hostname;
  currentUrl.port = "8000";

  if (hostname === "localhost" || hostname === "::1" || hostname === "[::1]") {
    return "http://127.0.0.1:8000";
  }

  return currentUrl.origin;
}

const API_BASE = import.meta.env.VITE_API_URL || getDefaultApiBase();
const AUTH_STORAGE_KEY = "badminton-roster:auth";
const REQUEST_TIMEOUT_MS = 15000;

function formatErrorDetail(detail, fallback) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.msg === "string") {
          return item.msg;
        }
        return null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  if (detail && typeof detail === "object" && typeof detail.msg === "string") {
    return detail.msg;
  }

  return fallback;
}

function getAuthToken() {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    return parsed?.authToken || null;
  } catch {
    return null;
  }
}

function createHeaders(extraHeaders = {}) {
  const authToken = getAuthToken();
  return {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extraHeaders,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function withEditToken(path, editToken) {
  if (!editToken) return `${API_BASE}${path}`;

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("edit_token", editToken);
  return url.toString();
}

export async function generateRoster(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(formatErrorDetail(err.detail, `HTTP ${res.status}`));
  }

  return res.json();
}

export async function revalidateRoster(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/rosters/revalidate`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(formatErrorDetail(err.detail, `HTTP ${res.status}`));
  }

  return res.json();
}

async function readJson(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(formatErrorDetail(err.detail, `HTTP ${res.status}`));
  }

  return res.json();
}

export async function createSharedSession(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function fetchSharedSession(sessionId, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}`, editToken), {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function listSharedSessions() {
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function deleteSharedSession(sessionId, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}`, editToken), {
    method: "DELETE",
    headers: createHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(formatErrorDetail(err.detail, `HTTP ${res.status}`));
  }
}

export async function renameSharedSession(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/rename`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function startSharedRound(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/start-round`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function endSharedRound(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/end-round`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function undoSharedSession(sessionId) {
  const res = await fetchWithTimeout(`${API_BASE}/api/sessions/${sessionId}/undo`, {
    method: "POST",
    headers: createHeaders(),
  });

  return readJson(res);
}

export async function editSharedRound(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/edit-round`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updateSharedScore(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/score`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function batchUpdateSharedScores(sessionId, payload, editToken) {
  const res = await fetchWithTimeout(withEditToken(`/api/sessions/${sessionId}/scores/batch`, editToken), {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function listCompletedSessions() {
  const res = await fetchWithTimeout(`${API_BASE}/api/history/sessions`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function listPlayers() {
  const res = await fetchWithTimeout(`${API_BASE}/api/players`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function createPlayer(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/players`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updatePlayer(playerId, payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/players/${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function deletePlayer(playerId, payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/players/${encodeURIComponent(playerId)}/delete`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(formatErrorDetail(err.detail, `HTTP ${res.status}`));
  }
}

export async function listPlayerStats() {
  const res = await fetchWithTimeout(`${API_BASE}/api/stats/players`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function fetchPlayerStats(playerName) {
  const res = await fetchWithTimeout(`${API_BASE}/api/stats/players/${encodeURIComponent(playerName)}`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function fetchAuthSession() {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/session`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function signupWithPassword(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function loginWithPassword(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function loginWithGoogle(payload) {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function logoutAuthSession() {
  const res = await fetchWithTimeout(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function listWorkspaces() {
  const res = await fetch(`${API_BASE}/api/workspaces`, {
    headers: createHeaders(),
  });
  return readJson(res);
}

export async function selectActiveWorkspace(payload) {
  const res = await fetch(`${API_BASE}/api/workspaces/active`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}
