import { expect } from "@playwright/test";

const ORGANIZER_EMAIL = process.env.PLAYWRIGHT_ORGANIZER_EMAIL || "organizer@example.com";
const ORGANIZER_PASSWORD = process.env.PLAYWRIGHT_ORGANIZER_PASSWORD || "organizer-password";
const ORGANIZER_NAME = process.env.PLAYWRIGHT_ORGANIZER_NAME || "Playwright Organizer";

export async function openAuthDialog(page, mode = "login") {
  await page.getByRole("button", { name: "Login", exact: true }).click();
  const authDialog = page.locator("div.fixed.inset-0").filter({
    has: page.getByRole("button", { name: "Close auth dialog" }),
  }).last();
  await expect(authDialog).toBeVisible();
  if (mode === "signup") {
    await authDialog.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(authDialog.getByRole("heading", { name: "Create your account" })).toBeVisible();
  } else {
    await expect(authDialog.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  }
}

export async function signupWithPassword(page, { displayName, email, password }) {
  await openAuthDialog(page, "signup");
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
}

export async function loginWithPassword(page, { email, password }) {
  await openAuthDialog(page, "login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function loginAsOrganizer(page) {
  await loginAsOrganizerWithCredentials(page, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
    displayName: ORGANIZER_NAME,
  });
}

export async function loginAsOrganizerWithCredentials(page, { email, password, displayName = ORGANIZER_NAME }) {
  await loginWithPassword(page, {
    email,
    password,
  });

  const logoutButton = page.getByRole("button", { name: "Logout" });
  try {
    await expect(logoutButton).toBeVisible({ timeout: 1500 });
  } catch {
    if (await page.getByText("Invalid email or password").isVisible().catch(() => false)) {
      const authDialog = page.locator("div.fixed.inset-0").filter({
        has: page.getByRole("button", { name: "Close auth dialog" }),
      }).last();
      await authDialog.getByRole("button", { name: "Sign Up", exact: true }).click();
      await authDialog.getByLabel("Display name").fill(displayName);
      await authDialog.getByLabel("Email").fill(email);
      await authDialog.getByLabel("Password").fill(password);
      await authDialog.getByRole("button", { name: "Create Account" }).click();
    } else {
      throw new Error("Organizer login did not complete and no credential error was shown.");
    }
  }

  await expect(logoutButton).toBeVisible();
  await expect(page.getByText(/workspace/i)).toBeVisible();
}
