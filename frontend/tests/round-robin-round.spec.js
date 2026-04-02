import { expect, test } from "@playwright/test";
import { createRoundRobinSession, openSession } from "./helpers/session";

test("@smoke ending the last league round should complete the session and show results", async ({ page, request }) => {
  const session = await createRoundRobinSession(request, "Round Robin Round Smoke");
  const { session_id: sessionId, edit_token: editToken } = session;

  await openSession(page, sessionId, editToken);

  await expect(page.getByText("Upcoming League Rounds")).toBeVisible();
  await page.getByText("Upcoming League Rounds").click();
  await page.getByRole("button", { name: "Start Round" }).click();

  const liveInputs = page.locator('input[type="number"]:not([disabled])');
  await liveInputs.nth(0).fill("21");
  await liveInputs.nth(1).fill("15");

  await page.getByRole("button", { name: /End Round/ }).first().click();

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByText("Tournament Results")).toBeVisible();
});
