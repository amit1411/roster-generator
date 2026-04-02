import { expect, test } from "@playwright/test";

async function createKnockoutSession(request) {
  const generatePayload = {
    players: ["A", "B", "C", "D", "E", "F", "G", "H"],
    fixed_pairs: [
      ["A", "B"],
      ["C", "D"],
      ["E", "F"],
      ["G", "H"],
    ],
    num_courts: 2,
    court_numbers: ["1", "2"],
    rounds: 1,
    limits: {},
    pair_games: 1,
    pair_start_round: 1,
    max_consecutive_rest: 1,
    seed: 1,
  };

  const rosterResponse = await request.post("http://127.0.0.1:8000/api/generate", {
    data: generatePayload,
  });
  expect(rosterResponse.ok()).toBeTruthy();
  const roster = await rosterResponse.json();

  const sessionResponse = await request.post("http://127.0.0.1:8000/api/sessions", {
    data: {
      name: "Knockout Finish Repro",
      roster,
      draw_config: {
        draw_type: "league_knockout",
        league_meetings: 1,
        knockout_qualifiers: 4,
      },
    },
  });
  expect(sessionResponse.ok()).toBeTruthy();
  return sessionResponse.json();
}

async function postRound(request, sessionId, editToken, path, payload) {
  const response = await request.post(
    `http://127.0.0.1:8000/api/sessions/${sessionId}/${path}?edit_token=${encodeURIComponent(editToken)}`,
    { data: payload }
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function postScore(request, sessionId, editToken, payload) {
  const response = await request.post(
    `http://127.0.0.1:8000/api/sessions/${sessionId}/score?edit_token=${encodeURIComponent(editToken)}`,
    { data: payload }
  );
  expect(response.ok()).toBeTruthy();
}

test("ending the final knockout round should show session results", async ({ page, request }) => {
  const session = await createKnockoutSession(request);
  const { session_id: sessionId, edit_token: editToken } = session;

  await postRound(request, sessionId, editToken, "start-round", { stage: "league", round_index: 0 });
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
    value: 10,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 1,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 1,
    team_key: "teamB",
    value: 9,
  });
  await postRound(request, sessionId, editToken, "end-round", { stage: "league", round_index: 0 });

  await postRound(request, sessionId, editToken, "start-round", { stage: "knockout", round_index: 0 });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 0,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 0,
    team_key: "teamB",
    value: 18,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 1,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 1,
    team_key: "teamB",
    value: 17,
  });
  await postRound(request, sessionId, editToken, "end-round", { stage: "knockout", round_index: 0 });

  await page.goto(`/?session=${sessionId}&edit=${editToken}`);
  await expect(page.getByText("Upcoming Knockout Rounds")).toBeVisible();
  await page.getByText("Upcoming Knockout Rounds").click();
  await page.getByRole("button", { name: "Start Round" }).click();
  const liveInputs = page.locator('input[type="number"]:not([disabled])');
  await liveInputs.nth(0).fill("21");
  await liveInputs.nth(1).fill("19");
  await page.getByRole("button", { name: /End Round/ }).first().click();

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible({ timeout: 15000 });
});
