import { expect, test } from "@playwright/test";
import { navigateToSection } from "./helpers/navigation";
import {
  completeRoundRobinSession,
  createRoundRobinSession,
} from "./helpers/session";

test("history shows only completed sessions while active sessions stay separate", async ({ page, request }, testInfo) => {
  const completedName = `History Complete ${testInfo.project.name}`;
  const activeName = `History Active ${testInfo.project.name}`;

  await completeRoundRobinSession(request, completedName);
  await createRoundRobinSession(request, activeName);

  await page.goto("/");
  await navigateToSection(page, "History");

  const historySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Historical results" }) });
  const historyCard = historySection.locator("div.rounded-2xl").filter({ hasText: completedName }).first();
  await expect(historyCard.getByText(completedName)).toBeVisible();
  await expect(page.getByText("No completed sessions yet.")).toHaveCount(0);
  await expect(page.getByText(activeName)).toHaveCount(0);

  await navigateToSection(page, "Active Sessions");
  const activeSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Sessions that are ready or in progress" }) });
  const activeCard = activeSection.locator("div.rounded-2xl").filter({ hasText: activeName }).first();
  await expect(activeCard.getByText(activeName)).toBeVisible();
  await expect(page.getByText(completedName)).toHaveCount(0);
});
