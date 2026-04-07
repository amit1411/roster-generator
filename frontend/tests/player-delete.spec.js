import { expect, test } from "@playwright/test";
import { loginAsOrganizer } from "./helpers/auth";
import { navigateToSection } from "./helpers/navigation";
import { createPlayer, createSharedSession, generateRoster, postRoundAction, postScore } from "./helpers/session";

test("deleting a player from the directory keeps historical stats unless requested", async ({ page, request }, testInfo) => {
  const suffix = testInfo.project.name;
  const alphaName = `Delete Alpha ${suffix}`;
  const bravoName = `Delete Bravo ${suffix}`;
  const charlieName = `Delete Charlie ${suffix}`;
  const deltaName = `Delete Delta ${suffix}`;

  const roster = await generateRoster(request, {
    players: [alphaName, bravoName, charlieName, deltaName],
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
  await loginAsOrganizer(page);
  await navigateToSection(page, "Players");

  const directorySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Registered players" }) });
  const directoryCard = directorySection.locator("div.rounded-2xl.border.border-gray-200.bg-gray-50").filter({ hasText: alphaName }).first();
  await directoryCard.scrollIntoViewIfNeeded();
  await directoryCard.getByRole("button", { name: "Delete", exact: true }).click();

  const deleteDialog = page.locator("div.fixed.inset-0").filter({ hasText: "This action is intentionally strict" });
  await expect(deleteDialog.getByText("This action is intentionally strict")).toBeVisible();
  await expect(deleteDialog.getByText("Also delete historical player records")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete Player" }).click();

  await expect(directoryCard).toHaveCount(0);

  await navigateToSection(page, "Player Stats");
  await expect(page.getByRole("button", { name: new RegExp(alphaName) })).toBeVisible();
});

test("recreating a deleted player restores the same player name cleanly", async ({ page, request }, testInfo) => {
  const suffix = testInfo.project.name;
  const fullName = `Restore Player ${suffix}`;
  const restoredShortName = `RP-${suffix}`;
  const helperPlayers = [
    { fullName: `Restore Helper Bravo ${suffix}`, shortName: `Restore Helper Bravo ${suffix}` },
    { fullName: `Restore Helper Charlie ${suffix}`, shortName: `Restore Helper Charlie ${suffix}` },
    { fullName: `Restore Helper Delta ${suffix}`, shortName: `Restore Helper Delta ${suffix}` },
  ];

  const createdPlayers = [];
  createdPlayers.push(await createPlayer(request, { fullName, shortName: fullName }));
  for (const player of helperPlayers) {
    createdPlayers.push(await createPlayer(request, player));
  }

  const roster = await generateRoster(request, {
    players: [fullName, ...helperPlayers.map((player) => player.fullName)],
    num_courts: 1,
    court_numbers: ["1"],
    rounds: 1,
    seed: 17,
  });

  const session = await createSharedSession(request, {
    name: `Restore Player Session ${suffix}`,
    roster,
    drawConfig: {
      draw_type: "round_robin",
      league_meetings: 1,
      knockout_qualifiers: 4,
    },
    players: createdPlayers.map((player) => ({
      player_id: player.player_id,
      full_name: player.full_name,
      short_name: player.short_name,
    })),
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
    value: 14,
  });
  await postRoundAction(request, session.session_id, session.edit_token, "end-round", {
    stage: "league",
    round_index: 0,
  });

  await page.goto("/");
  await loginAsOrganizer(page);
  await navigateToSection(page, "Players");

  const directorySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Registered players" }) });
  const directoryCard = directorySection.locator("div.rounded-2xl.border.border-gray-200.bg-gray-50").filter({ hasText: fullName }).first();
  await expect(directoryCard).toBeVisible();

  await navigateToSection(page, "Players");
  const refreshedDirectorySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Registered players" }) });
  const refreshedDirectoryCard = refreshedDirectorySection.locator("div.rounded-2xl.border.border-gray-200.bg-gray-50").filter({ hasText: fullName }).first();
  await refreshedDirectoryCard.getByRole("button", { name: "Delete", exact: true }).click();
  const deleteDialog = page.locator("div.fixed.inset-0").filter({ hasText: "This action is intentionally strict" });
  await deleteDialog.getByRole("button", { name: "Delete Player" }).click();
  await expect(refreshedDirectoryCard).toHaveCount(0);

  await page.getByLabel("Full Name").fill(fullName);
  await page.getByLabel("Short Name").fill(restoredShortName);
  await page.getByRole("button", { name: "Create Player" }).click();

  const restoredCard = refreshedDirectorySection.locator("div.rounded-2xl.border.border-gray-200.bg-gray-50").filter({ hasText: fullName }).first();
  await expect(restoredCard).toBeVisible();

  await navigateToSection(page, "Player Stats");
  await expect(page.getByRole("button", { name: new RegExp(fullName) })).toBeVisible();

  await navigateToSection(page, "Planner");
  const searchInput = page.getByPlaceholder("Search players...");
  await searchInput.fill(restoredShortName);
  const directoryMatch = page.locator("section").filter({ has: page.getByRole("heading", { name: "Player Directory" }) });
  await expect(directoryMatch.getByText(fullName, { exact: true }).first()).toBeVisible();
});
