import { expect, test } from "@playwright/test";
import { loginAsOrganizer } from "./helpers/auth";
import { navigateToSection } from "./helpers/navigation";
import { completeRoundRobinSession } from "./helpers/session";

test("deleting a completed session removes it from organizer history and stats", async ({ page, request }) => {
  const session = await completeRoundRobinSession(request, "Delete History Keep Stats");
  const { session_id: sessionId, edit_token: editToken } = session;

  await page.goto(`/?session=${sessionId}&edit=${editToken}`);
  await page.getByRole("button", { name: "Back to Roster" }).click();
  await loginAsOrganizer(page);

  page.once("dialog", (dialog) => dialog.accept());
  await navigateToSection(page, "History");
  const historyCard = page.locator("div.rounded-2xl").filter({ hasText: "Delete History Keep Stats" }).first();
  await expect(historyCard.getByText("Delete History Keep Stats")).toBeVisible();
  await historyCard.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Delete History Keep Stats")).toHaveCount(0);

  await navigateToSection(page, "Player Stats");
  const leaderboard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Leaderboard" }) });
  await expect(leaderboard.getByRole("button", { name: /^A\b/ })).toHaveCount(0);
});
