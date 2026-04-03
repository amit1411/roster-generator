const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function withEditToken(path, editToken) {
  if (!editToken) return `${API_BASE}${path}`;

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("edit_token", editToken);
  return url.toString();
}

export async function generateRoster(payload) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

async function readJson(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function createSharedSession(payload) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function fetchSharedSession(sessionId, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}`, editToken));
  return readJson(res);
}

export async function listSharedSessions() {
  const res = await fetch(`${API_BASE}/api/sessions`);
  return readJson(res);
}

export async function deleteSharedSession(sessionId, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}`, editToken), {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function renameSharedSession(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/rename`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function startSharedRound(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/start-round`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function endSharedRound(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/end-round`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function undoSharedSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/undo`, {
    method: "POST",
  });

  return readJson(res);
}

export async function editSharedRound(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/edit-round`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updateSharedScore(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/score`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function batchUpdateSharedScores(sessionId, payload, editToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/scores/batch`, editToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function listCompletedSessions() {
  const res = await fetch(`${API_BASE}/api/history/sessions`);
  return readJson(res);
}

export async function listPlayers() {
  const res = await fetch(`${API_BASE}/api/players`);
  return readJson(res);
}

export async function createPlayer(payload) {
  const res = await fetch(`${API_BASE}/api/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updatePlayer(playerId, payload) {
  const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function deletePlayer(playerId, payload) {
  const res = await fetch(`${API_BASE}/api/players/${encodeURIComponent(playerId)}/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function listPlayerStats() {
  const res = await fetch(`${API_BASE}/api/stats/players`);
  return readJson(res);
}

export async function fetchPlayerStats(playerName) {
  const res = await fetch(`${API_BASE}/api/stats/players/${encodeURIComponent(playerName)}`);
  return readJson(res);
}
