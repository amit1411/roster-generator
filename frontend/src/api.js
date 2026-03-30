const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export async function fetchSharedSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
  return readJson(res);
}

export async function startSharedRound(sessionId, payload) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/start-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function endSharedRound(sessionId, payload) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/end-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updateSharedScore(sessionId, payload) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}
