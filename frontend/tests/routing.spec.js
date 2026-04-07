import { expect, test } from "@playwright/test";
import { completeRoundRobinSession } from "./helpers/session";
import { navigateToSection } from "./helpers/navigation";

test("direct routes open their matching app sections", async ({ page }) => {
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "Build the next session from scratch" })).toBeVisible();

  await page.goto("/players");
  await expect(page.getByRole("heading", { name: "Build a clean player directory once" })).toBeVisible();

  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "Resume, share, and manage ongoing sessions" })).toBeVisible();

  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "Completed sessions and final results" })).toBeVisible();

  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "League and knockout performance in one place" })).toBeVisible();
});

test("legacy shared-session query links redirect to the scoring route", async ({ page, request }) => {
  const session = await completeRoundRobinSession(request, "Legacy Session Link");

  await page.goto(`/?session=${session.session_id}&edit=${session.edit_token}`);

  await expect(page).toHaveURL(new RegExp(`/sessions/${session.session_id}\\?edit=`));
  await expect(page.getByRole("button", { name: "Back to Roster" })).toBeVisible();
  await expect(page.getByText("Session Legacy Session Link")).toBeVisible();
});

test("browser back and forward follow route navigation", async ({ page }) => {
  await page.goto("/planner");
  await navigateToSection(page, "Players");
  await expect(page).toHaveURL(/\/players$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/planner$/);

  await page.goForward();
  await expect(page).toHaveURL(/\/players$/);
});
