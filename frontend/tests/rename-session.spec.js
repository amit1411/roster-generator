import { expect, test } from "@playwright/test";

async function createSession(page) {
  await page.goto("/");

  await page.getByRole("button", { name: "Next: Settings" }).click();
  await page.getByRole("button", { name: "Next: Review" }).click();
  await page.getByRole("button", { name: "Generate Roster", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Session" })).toBeVisible();
  await page.getByRole("button", { name: "Start Session" }).click();
  await expect(page.getByRole("button", { name: "Rename Session" })).toBeVisible();
}

test("@smoke session can be renamed from scoring view and session list", async ({ page }) => {
  await createSession(page);

  await page.getByRole("button", { name: "Rename Session" }).click();
  await page.getByLabel("Session name").fill("Evening Ladder");
  await page.getByRole("button", { name: "Save Name" }).click();
  await expect(page.getByText("Session Evening Ladder")).toBeVisible();

  await page.getByRole("button", { name: "Back to Roster" }).click();
  await page.getByRole("button", { name: "Active Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Evening Ladder" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Rename" }).first().click();
  await page.getByLabel("Session name").fill("Thursday Club");
  await page.getByRole("button", { name: "Save Name" }).click();
  await expect(page.getByRole("heading", { name: "Thursday Club" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open Scorer View" }).click();
  await expect(page.getByText("Session Thursday Club")).toBeVisible();
});
