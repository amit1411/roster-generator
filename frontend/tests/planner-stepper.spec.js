import { expect, test } from "@playwright/test";
import { createPlayer } from "./helpers/session";

test("planner steps can be clicked to jump between stages", async ({ page, request }) => {
  const players = [
    { fullName: "Stepper Alpha", shortName: "SA1" },
    { fullName: "Stepper Bravo", shortName: "SB1" },
    { fullName: "Stepper Charlie", shortName: "SC1" },
    { fullName: "Stepper Delta", shortName: "SD1" },
  ];

  for (const player of players) {
    await createPlayer(request, player);
  }

  await page.goto("/");

  const searchInput = page.getByPlaceholder("Search players...");
  const directorySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Player Directory" }) });
  for (const player of players) {
    await searchInput.fill(player.shortName);
    const card = directorySection.locator("div").filter({ hasText: player.fullName }).first();
    await card.getByRole("button", { name: "Add" }).click();
  }

  await page.getByRole("button", { name: "Next: Settings" }).click();
  await expect(page.getByRole("button", { name: /Step 3 Review & Start/i })).toBeDisabled();
  await page.getByRole("button", { name: "Next: Review" }).click();
  await expect(page.getByRole("heading", { name: "Review and start" })).toBeVisible();

  await page.getByRole("button", { name: /Step 1 Players & Pairs/i }).click();
  await expect(page.getByRole("heading", { name: "Players and pairs" })).toBeVisible();
});
