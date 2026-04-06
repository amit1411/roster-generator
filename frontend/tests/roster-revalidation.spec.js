import { expect, test } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL || "http://127.0.0.1:8010";
const ADMIN_TOKEN = process.env.PLAYWRIGHT_ADMIN_TOKEN || "thisismytoken";

test("revalidating an edited roster recalculates fixed-pair violations", async ({ request }) => {
  const generateResponse = await request.post(`${API_BASE}/api/generate`, {
    data: {
      players: ["A", "B", "C", "D"],
      fixed_pairs: [["A", "B"]],
      num_courts: 1,
      court_numbers: ["1"],
      rounds: 1,
      limits: {},
      pair_games: 1,
      pair_start_round: 1,
      max_consecutive_rest: 1,
      seed: 1,
    },
  });
  expect(generateResponse.ok()).toBeTruthy();
  const roster = await generateResponse.json();

  roster.rounds[0].courts[0].team_a = ["A", "C"];
  roster.rounds[0].courts[0].team_b = ["B", "D"];

  const revalidateResponse = await request.post(`${API_BASE}/api/rosters/revalidate`, {
    data: {
      roster,
      players: ["A", "B", "C", "D"],
      fixed_pairs: [["A", "B"]],
      num_courts: 1,
      court_numbers: ["1"],
      rounds: 1,
      limits: {},
      pair_games: 1,
      pair_start_round: 1,
      max_consecutive_rest: 1,
    },
  });

  expect(revalidateResponse.ok()).toBeTruthy();
  const normalized = await revalidateResponse.json();
  expect(normalized.fixed_pair_counts["A & B"]).toBe(0);
  expect(normalized.violations).toContain("A & B: played 0 games together (target 1)");
});

test("session creation rejects malformed manually edited rosters", async ({ request }) => {
  const response = await request.post(`${API_BASE}/api/sessions`, {
    data: {
      name: "Invalid Edited Roster",
      roster: {
        rounds: [
          {
            round: 1,
            courts: [
              {
                team_a: ["A", "A"],
                team_b: ["C", "D"],
              },
            ],
            resting: [],
          },
        ],
        court_numbers: ["1"],
        rest_counts: { A: 0, C: 0, D: 0 },
        fixed_pair_counts: {},
        violations: [],
        warnings: [],
      },
      draw_config: {
        draw_type: "round_robin",
        league_meetings: 1,
        knockout_qualifiers: 4,
      },
      selected_players: [
        { player_id: "p1", full_name: "A", short_name: "A" },
        { player_id: "p2", full_name: "B", short_name: "B" },
        { player_id: "p3", full_name: "C", short_name: "C" },
        { player_id: "p4", full_name: "D", short_name: "D" },
      ],
      fixed_pairs: [],
      limits: {},
      pair_games: 1,
      pair_start_round: 1,
      max_consecutive_rest: 1,
      admin_token: ADMIN_TOKEN,
    },
  });

  expect(response.status()).toBe(422);
  await expect(response.json()).resolves.toMatchObject({
    detail: "Round 1 must include every selected player exactly once",
  });
});
