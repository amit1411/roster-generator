import { expect, test } from "@playwright/test";
import { completeRoundRobinSession } from "./helpers/session";

test("player stats page shows completed-session analytics", async ({ page, request }) => {
  await completeRoundRobinSession(request, "Player Stats Complete");

  await page.goto("/");
  await page.getByRole("button", { name: "Player Stats" }).click();

  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  const leaderboard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Leaderboard" }) });
  await leaderboard.getByRole("button", { name: /^A\b/ }).click();
  const profileSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "A", exact: true }) });
  await expect(profileSection.getByRole("heading", { name: "A", exact: true })).toBeVisible();
  await expect(profileSection.getByText("Sessions", { exact: true })).toBeVisible();
  await expect(profileSection.getByText("Matches", { exact: true })).toBeVisible();
  await expect(page.getByText("Last completed session:", { exact: false })).toBeVisible();
  await expect(page.getByText("Best-performing partners for A")).toBeVisible();
  await expect(page.getByText("% win rate", { exact: false }).first()).toBeVisible();
});
