import { expect, test } from "@playwright/test";
import { createSharedSession, generateRoster, postRoundAction, postScore } from "./helpers/session";

test("deleting a player from the directory keeps historical stats unless requested", async ({ page, request }) => {
  const roster = await generateRoster(request, {
    players: ["Delete Alpha", "Delete Bravo", "Delete Charlie", "Delete Delta"],
    num_courts: 1,
    court_numbers: ["1"],
    rounds: 1,
    seed: 13,
  });

  const session = await createSharedSession(request, {
    name: "Delete Player Session",
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
    value: 18,
  });
  await postRoundAction(request, session.session_id, session.edit_token, "end-round", {
    stage: "league",
    round_index: 0,
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Players", exact: true }).click();

  const directoryCard = page.locator("div.rounded-2xl.border.border-gray-200.bg-gray-50").filter({ hasText: "Delete Alpha" }).first();
  await directoryCard.scrollIntoViewIfNeeded();
  await directoryCard.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(page.getByText("This action is intentionally strict")).toBeVisible();
  await expect(page.getByText("Also delete historical player records")).toBeVisible();
  await page.getByPlaceholder("Enter ADMIN_RECOVERY_TOKEN").fill("thisismytoken");
  await page.getByRole("button", { name: "Delete Player" }).click();

  await expect(page.getByText("Delete Alpha")).toHaveCount(0);

  await page.getByRole("button", { name: "Player Stats" }).click();
  await expect(page.getByRole("button", { name: /Delete Alpha/ })).toBeVisible();
});
