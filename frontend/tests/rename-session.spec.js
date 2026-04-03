import { expect, test } from "@playwright/test";
import { createRoundRobinSession, openSession } from "./helpers/session";

test("@smoke session can be renamed from scoring view and session list", async ({ page, request }) => {
  const session = await createRoundRobinSession(request, "Rename Session Seed");

  await openSession(page, session.session_id, session.edit_token);
  await expect(page.getByRole("button", { name: "Rename Session" })).toBeVisible();

  await page.getByRole("button", { name: "Rename Session" }).click();
  await page.getByLabel("Session name").fill("Evening Ladder");
  await page.getByRole("button", { name: "Save Name" }).click();
  await expect(page.getByText("Session Evening Ladder")).toBeVisible();

  await page.getByRole("button", { name: "Back to Roster" }).click();
  await page.getByRole("button", { name: "Active Sessions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evening Ladder" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Rename" }).first().click();
  await page.getByLabel("Session name").fill("Thursday Club");
  await page.getByRole("button", { name: "Save Name" }).click();
  await expect(page.getByRole("heading", { name: "Thursday Club" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open Scorer View" }).click();
  await expect(page.getByText("Session Thursday Club")).toBeVisible();
});
