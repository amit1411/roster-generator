import { expect, test } from "@playwright/test";
import { completeRoundRobinSession } from "./helpers/session";

test("deleting a completed session removes it from history but keeps player stats", async ({ page, request }) => {
  const session = await completeRoundRobinSession(request, "Delete History Keep Stats");
  const { session_id: sessionId, edit_token: editToken } = session;

  await page.goto(`/?session=${sessionId}&edit=${editToken}`);
  await page.getByRole("button", { name: "Back to Roster" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "Delete History Keep Stats" })).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Delete History Keep Stats")).toHaveCount(0);

  await page.getByRole("button", { name: "Player Stats" }).click();
  const leaderboard = page.locator("section").filter({ has: page.getByRole("heading", { name: "Leaderboard" }) });
  await expect(leaderboard.getByRole("button", { name: /^A\b/ })).toBeVisible();
});
