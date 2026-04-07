import { expect, test } from "@playwright/test";
import { loginWithPassword, signupWithPassword } from "./helpers/auth";
import { navigateToSection } from "./helpers/navigation";

function uniqueEmail(testInfo, prefix = "user") {
  const slug = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}-${slug}-${testInfo.project.name}@example.com`;
}

async function buildMinimalRoster(page) {
  await navigateToSection(page, "Planner");

  const searchInput = page.getByPlaceholder("Search players...");
  const directorySection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Player Directory" }) });
  const plannerDirectoryEmpty = await directorySection
    .getByText("No players in the directory yet")
    .isVisible()
    .catch(() => false);
  if (plannerDirectoryEmpty) {
    await navigateToSection(page, "Players");
    const playersDirectory = page.locator("section").filter({ has: page.getByRole("heading", { name: "Registered players" }) });
    for (const player of [
      { fullName: "Adi", shortName: "Adi" },
      { fullName: "Amit", shortName: "Amit" },
      { fullName: "Ashok", shortName: "Ashok" },
      { fullName: "Avinash", shortName: "Avinash" },
    ]) {
      await page.getByLabel("Full Name").fill(player.fullName);
      await page.getByLabel("Short Name").fill(player.shortName);
      await page.getByRole("button", { name: "Create Player" }).click();
      await expect(playersDirectory.getByText(player.fullName, { exact: true }).first()).toBeVisible();
    }
    await navigateToSection(page, "Planner");
  }
  for (const shortName of ["Adi", "Amit", "Ashok", "Avinash"]) {
    await searchInput.fill(shortName);
    const card = directorySection.locator("div.rounded-2xl").filter({ hasText: shortName }).first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Add" }).click();
  }
  await searchInput.fill("");

  await page.getByRole("button", { name: "Next: Settings" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Next: Review" }).click();
  await page.getByRole("button", { name: "Generate Roster" }).click();
  await expect(page.getByRole("heading", { name: "Roster" })).toBeVisible();
}

test("signup validation shows readable password errors", async ({ page }, testInfo) => {
  await page.goto("/");

  await signupWithPassword(page, {
    displayName: "Validation User",
    email: uniqueEmail(testInfo, "validation"),
    password: "1234",
  });

  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
});

test("email signup creates a normal signed-in user", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = uniqueEmail(testInfo, "signup");
  await signupWithPassword(page, {
    displayName: "Amit Signup",
    email,
    password: "strong-pass-123",
  });

  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(page.getByText("Amit Signup", { exact: true })).toBeVisible();
  await expect(page.getByText(/workspace/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Player Stats", exact: true })).toBeVisible();
});

test("email login works after signup and logout", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = uniqueEmail(testInfo, "login");
  const password = "strong-pass-123";

  await signupWithPassword(page, {
    displayName: "Login User",
    email,
    password,
  });

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();

  await loginWithPassword(page, { email, password });
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(page.getByText("Login User", { exact: true })).toBeVisible();
});

test("login shows readable error for bad password", async ({ page }, testInfo) => {
  await page.goto("/");

  const email = uniqueEmail(testInfo, "bad-login");
  await signupWithPassword(page, {
    displayName: "Bad Login User",
    email,
    password: "correct-password",
  });

  await page.getByRole("button", { name: "Logout" }).click();
  await loginWithPassword(page, { email, password: "wrong-password" });

  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("players page stays hidden behind organizer login for anonymous users", async ({ page }) => {
  await page.goto("/players");
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByText("Sign in to plan tournaments")).toBeVisible();
});

test("organizer signup can start a session without being prompted to log in again", async ({ page }, testInfo) => {
  await page.goto("/");

  await signupWithPassword(page, {
    displayName: "Organizer User",
    email: uniqueEmail(testInfo, "organizer-user"),
    password: "strong-pass-123",
  });

  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  await buildMinimalRoster(page);
  await page.getByRole("button", { name: "Start Session" }).click();

  await expect(page.getByText("Scoring Console")).toBeVisible();
});
