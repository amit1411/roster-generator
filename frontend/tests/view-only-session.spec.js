import { expect, test } from "@playwright/test";
import { createRoundRobinSession, openSession } from "./helpers/session";

test("@smoke shared session link without edit token opens in view-only mode", async ({ page, request }) => {
  const session = await createRoundRobinSession(request, "View Only Smoke");
  const { session_id: sessionId } = session;

  await openSession(page, sessionId);

  await expect(page.getByText("Session View Only Smoke")).toBeVisible();
  await expect(page.getByText("View Only", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rename Session" })).toHaveCount(0);
  await page.getByText("Upcoming League Rounds").click();
  await expect(page.getByRole("button", { name: "Start Round" })).toBeDisabled();
});
