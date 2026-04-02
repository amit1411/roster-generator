import { expect } from "@playwright/test";

const API_BASE = "http://127.0.0.1:8000";

export async function generateRoster(request, overrides = {}) {
  const payload = {
    players: ["A", "B", "C", "D"],
    fixed_pairs: [],
    num_courts: 1,
    court_numbers: ["1"],
    rounds: 1,
    limits: {},
    pair_games: 1,
    pair_start_round: 1,
    max_consecutive_rest: 1,
    seed: 1,
    ...overrides,
  };

  const response = await request.post(`${API_BASE}/api/generate`, { data: payload });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function createSharedSession(request, { name, roster, drawConfig }) {
  const response = await request.post(`${API_BASE}/api/sessions`, {
    data: {
      name,
      roster,
      draw_config: drawConfig,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function createRoundRobinSession(request, name = "Round Robin Smoke") {
  const roster = await generateRoster(request);
  return createSharedSession(request, {
    name,
    roster,
    drawConfig: {
      draw_type: "round_robin",
      league_meetings: 1,
      knockout_qualifiers: 4,
    },
  });
}

export async function createKnockoutSession(request, name = "Knockout Smoke") {
  const roster = await generateRoster(request, {
    players: ["A", "B", "C", "D", "E", "F", "G", "H"],
    fixed_pairs: [
      ["A", "B"],
      ["C", "D"],
      ["E", "F"],
      ["G", "H"],
    ],
    num_courts: 2,
    court_numbers: ["1", "2"],
  });

  return createSharedSession(request, {
    name,
    roster,
    drawConfig: {
      draw_type: "league_knockout",
      league_meetings: 1,
      knockout_qualifiers: 4,
    },
  });
}

export async function postScore(request, sessionId, editToken, payload) {
  const response = await request.post(
    `${API_BASE}/api/sessions/${sessionId}/score?edit_token=${encodeURIComponent(editToken)}`,
    { data: payload }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function postRoundAction(request, sessionId, editToken, path, payload) {
  const response = await request.post(
    `${API_BASE}/api/sessions/${sessionId}/${path}?edit_token=${encodeURIComponent(editToken)}`,
    { data: payload }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function openSession(page, sessionId, editToken = null) {
  const search = new URLSearchParams();
  search.set("session", sessionId);
  if (editToken) {
    search.set("edit", editToken);
  }
  await page.goto(`/?${search.toString()}`);
}
