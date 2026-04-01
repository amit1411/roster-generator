const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function withEditToken(path, editToken) {
  if (!editToken) return `${API_BASE}${path}`;

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("edit_token", editToken);
  return url.toString();
}

function createHeaders(authToken, extraHeaders = {}) {
  return {
    ...extraHeaders,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
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

export async function register(payload) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function login(payload) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function loginWithGoogle(credential) {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  return readJson(res);
}

export async function fetchCurrentUser(authToken) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: createHeaders(authToken),
  });

  return readJson(res);
}

export async function createSharedSession(payload, authToken) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: createHeaders(authToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function fetchSharedSession(sessionId, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}`, editToken), {
    headers: createHeaders(authToken),
  });
  return readJson(res);
}

export async function listSharedSessions(authToken) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    headers: createHeaders(authToken),
  });
  return readJson(res);
}

export async function deleteSharedSession(sessionId, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}`, editToken), {
    method: "DELETE",
    headers: createHeaders(authToken),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Server error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
}

export async function startSharedRound(sessionId, payload, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/start-round`, editToken), {
    method: "POST",
    headers: createHeaders(authToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function endSharedRound(sessionId, payload, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/end-round`, editToken), {
    method: "POST",
    headers: createHeaders(authToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function undoSharedSession(sessionId, authToken) {
  const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/undo`, {
    method: "POST",
    headers: createHeaders(authToken),
  });

  return readJson(res);
}

export async function editSharedRound(sessionId, payload, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/edit-round`, editToken), {
    method: "POST",
    headers: createHeaders(authToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function updateSharedScore(sessionId, payload, editToken, authToken) {
  const res = await fetch(withEditToken(`/api/sessions/${sessionId}/score`, editToken), {
    method: "POST",
    headers: createHeaders(authToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}
