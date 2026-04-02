import { expect, test } from "@playwright/test";
import {
  completeRoundRobinSession,
  createRoundRobinSession,
} from "./helpers/session";

test("history shows only completed sessions while active sessions stay separate", async ({ page, request }) => {
  await completeRoundRobinSession(request, "History Complete");
  await createRoundRobinSession(request, "History Active");

  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();

  await expect(page.getByRole("heading", { name: "History Complete" })).toBeVisible();
  await expect(page.getByText("No completed sessions yet.")).toHaveCount(0);
  await expect(page.getByText("History Active")).toHaveCount(0);

  await page.getByRole("button", { name: "Active Sessions" }).click();
  await expect(page.getByRole("heading", { name: "History Active" })).toBeVisible();
  await expect(page.getByText("History Complete")).toHaveCount(0);
});
