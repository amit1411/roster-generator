import { expect, test } from "@playwright/test";
import { createSharedSession, generateRoster, postRoundAction, postScore } from "./helpers/session";

test("editing a player keeps existing completed stats mapped to the same player", async ({ page, request }) => {
  const roster = await generateRoster(request, {
    players: ["Legacy Alpha", "Legacy Bravo", "Legacy Charlie", "Legacy Delta"],
    num_courts: 1,
    court_numbers: ["1"],
    rounds: 1,
    seed: 7,
  });

  const session = await createSharedSession(request, {
    name: "Legacy Edit Session",
    roster,
    drawConfig: {
      draw_type: "round_robin",
      league_meetings: 1,
      knockout_qualifiers: 4,
    },
  });

  await postRoundAction(request, session.session_id, session.edit_token, "start-round", {
    stage: "league",
    round_index: 0,
  });
  await postScore(request, session.session_id, session.edit_token, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, session.session_id, session.edit_token, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamB",
    value: 12,
  });
  await postRoundAction(request, session.session_id, session.edit_token, "end-round", {
    stage: "league",
    round_index: 0,
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Players", exact: true }).click();

  const directoryCard = page.locator("div.rounded-2xl").filter({ hasText: "Legacy Alpha" }).first();
  await directoryCard.getByRole("button", { name: "Edit" }).click();

  await page.getByLabel("Full Name").last().fill("Alpha Prime");
  await page.getByLabel("Short Name").last().fill("AP");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Alpha Prime")).toBeVisible();
  await expect(page.getByText("Also matched from older names:", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Player Stats" }).click();
  await expect(page.getByRole("button", { name: /Alpha Prime/ })).toBeVisible();
});
