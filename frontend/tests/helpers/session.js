import { expect } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:8010";
const ADMIN_TOKEN = process.env.PLAYWRIGHT_ADMIN_TOKEN || "thisismytoken";

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

export async function createSharedSession(request, { name, roster, drawConfig, players = [], fixedPairs = [], limits = {}, pairGames = 1, pairStartRound = 1, maxConsecutiveRest = 1 }) {
  const response = await request.post(`${API_BASE}/api/sessions`, {
    data: {
      name,
      roster,
      draw_config: drawConfig,
      selected_players: players,
      fixed_pairs: fixedPairs,
      limits,
      pair_games: pairGames,
      pair_start_round: pairStartRound,
      max_consecutive_rest: maxConsecutiveRest,
      admin_token: ADMIN_TOKEN,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function createPlayer(request, { fullName, shortName }) {
  const response = await request.post(`${API_BASE}/api/players`, {
    data: {
      full_name: fullName,
      short_name: shortName,
    },
  });

  if (response.ok()) {
    return response.json();
  }

  if (response.status() === 409) {
    const playersResponse = await request.get(`${API_BASE}/api/players`);
    expect(playersResponse.ok()).toBeTruthy();
    const players = await playersResponse.json();
    const normalizedFullName = fullName.trim().toLowerCase();
    const normalizedShortName = shortName.trim().toLowerCase();
    const existingPlayer = players.find((player) => {
      return (
        player.full_name.trim().toLowerCase() === normalizedFullName ||
        player.short_name.trim().toLowerCase() === normalizedShortName
      );
    });
    expect(existingPlayer).toBeTruthy();
    return existingPlayer;
  }

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

export async function completeRoundRobinSession(request, name = "Completed Round Robin") {
  const session = await createRoundRobinSession(request, name);
  const { session_id: sessionId, edit_token: editToken } = session;

  await postRoundAction(request, sessionId, editToken, "start-round", {
    stage: "league",
    round_index: 0,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamB",
    value: 14,
  });
  await postRoundAction(request, sessionId, editToken, "end-round", {
    stage: "league",
    round_index: 0,
  });

  return session;
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
  if (!response.ok()) {
    throw new Error(`POST /score failed (${response.status()}): ${await response.text()}`);
  }
  return response.json();
}

export async function postRoundAction(request, sessionId, editToken, path, payload) {
  const response = await request.post(
    `${API_BASE}/api/sessions/${sessionId}/${path}?edit_token=${encodeURIComponent(editToken)}`,
    { data: payload }
  );
  if (!response.ok()) {
    throw new Error(`POST /${path} failed (${response.status()}): ${await response.text()}`);
  }
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
