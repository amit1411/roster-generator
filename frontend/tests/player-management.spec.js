import { expect, test } from "@playwright/test";
import { createSharedSession, generateRoster } from "./helpers/session";

test("player directory imports names from existing sessions", async ({ page, request }) => {
  const roster = await generateRoster(request, {
    players: ["Legacy One", "Legacy Two", "Legacy Three", "Legacy Four"],
  });

  await createSharedSession(request, {
    name: "Legacy Import Session",
    roster,
    drawConfig: {
      draw_type: "round_robin",
      league_meetings: 1,
      knockout_qualifiers: 4,
    },
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Players", exact: true }).click();

  await expect(page.locator("p").filter({ hasText: /^Legacy One$/ })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^Legacy Two$/ })).toBeVisible();
});

test("players can be created and selected from the planner directory", async ({ page }) => {
  const players = [
    { fullName: "Player Alpha", shortName: "PA1" },
    { fullName: "Player Bravo", shortName: "PB1" },
    { fullName: "Player Charlie", shortName: "PC1" },
    { fullName: "Player Delta", shortName: "PD1" },
  ];

  await page.goto("/");
  await page.getByRole("button", { name: "Players", exact: true }).click();

  for (const player of players) {
    await page.getByLabel("Full Name").fill(player.fullName);
    await page.getByLabel("Short Name").fill(player.shortName);
    await page.getByRole("button", { name: "Create Player" }).click();
    await expect(page.getByText(player.fullName)).toBeVisible();
  }

  await page.getByRole("button", { name: "Planner" }).click();

  const searchInput = page.getByPlaceholder("Search players...");
  for (const player of players) {
    await searchInput.fill(player.shortName);
    const card = page.locator("section").filter({ has: page.getByText(player.fullName) }).last();
    await card.getByRole("button", { name: "Add" }).click();
  }
  await searchInput.fill("");

  await page.getByRole("button", { name: "Next: Settings" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Next: Review" }).click();
  await page.getByRole("button", { name: "Generate Roster" }).click();

  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "PA1" }).first()).toBeVisible();
});
