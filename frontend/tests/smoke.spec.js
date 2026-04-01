import { expect, test } from "@playwright/test";

function createUniqueEmail(prefix = "badminton-smoke") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

async function openReviewStep(page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Badminton" })).toBeVisible();
  await page.getByRole("button", { name: "Next: Settings" }).click();
  await page.getByRole("button", { name: "Next: Review" }).click();
}

async function generateRoster(page) {
  await page.getByRole("button", { name: "Generate Roster", exact: true }).click();
  await expect(page.getByText("The latest generated roster is ready to review below.")).toBeVisible({ timeout: 45000 });
}

async function registerAccount(page, email, name = "Smoke Tester") {
  await page.getByRole("button", { name: "Sign In to Start Session" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to manage sessions" })).toBeVisible();
  await page.getByRole("button", { name: "Create Account" }).first().click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("smoke-test-password");
  await page.getByRole("button", { name: "Create Account" }).last().click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
}

async function startOwnedSession(page, email = createUniqueEmail()) {
  await openReviewStep(page);
  await generateRoster(page);
  await registerAccount(page, email);

  await page.getByRole("button", {
    name: "Generate Roster Add players, configure settings, review the roster, and start a session.",
  }).click();
  await page.getByRole("button", { name: "Start Session" }).click();

  await expect(page.getByText(/Scoring Console/i)).toBeVisible({ timeout: 15000 });
  const sessionBadge = page.getByText(/^Session /);
  await expect(sessionBadge).toBeVisible();
  const sessionName = (await sessionBadge.textContent())?.replace(/^Session\s+/, "").trim() || "";

  const scorerUrl = page.url();
  const viewUrlObject = new URL(scorerUrl);
  viewUrlObject.searchParams.delete("edit");

  return {
    sessionName,
    scorerUrl,
    viewUrl: viewUrlObject.toString(),
  };
}

test("user can create an account, generate a roster, and start a session", async ({ page }) => {
  await startOwnedSession(page);
});

test("owner can find and reopen a session from existing sessions", async ({ page }) => {
  const { sessionName } = await startOwnedSession(page, createUniqueEmail("badminton-existing"));

  await page.getByRole("button", { name: "Back to Roster" }).click();
  await page.getByRole("button", { name: "Existing Sessions Open, share, or remove saved sessions." }).click();

  await expect(page.getByText(sessionName)).toBeVisible();
  await page.getByRole("button", { name: "Open Scorer View" }).first().click();

  await expect(page.getByText(/Scoring Console/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(new RegExp(`^Session\\s+${sessionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`))).toBeVisible();
});

test("public view link opens in read-only mode", async ({ browser, page }) => {
  const { viewUrl } = await startOwnedSession(page, createUniqueEmail("badminton-view"));

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();

  await viewerPage.goto(viewUrl);
  await expect(viewerPage.getByText(/Scoring Console/i)).toBeVisible({ timeout: 15000 });
  await expect(viewerPage.getByText("View Only")).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Sign In" })).toBeVisible();

  await viewerContext.close();
});
