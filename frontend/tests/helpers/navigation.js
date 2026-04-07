import { expect } from "@playwright/test";

const ROUTE_BY_LABEL = {
  Planner: "/planner",
  Players: "/players",
  "Active Sessions": "/sessions",
  History: "/history",
  Profile: "/profile",
  "Player Stats": "/stats",
};

export async function navigateToSection(page, label) {
  const desktopButton = page.getByRole("button", { name: label, exact: true });
  if (await desktopButton.isVisible().catch(() => false)) {
    await desktopButton.click();
    return;
  }

  const mobileMenuButton = page.getByRole("button", { name: "Open navigation" });
  if (await mobileMenuButton.isVisible().catch(() => false)) {
    await mobileMenuButton.click();
    await expect(page.locator("#mobile-global-nav")).toBeVisible();
    const mobileNavButton = page.getByRole("button", { name: label, exact: true });
    await expect(mobileNavButton).toBeVisible();
    await mobileNavButton.click();
    return;
  }

  const route = ROUTE_BY_LABEL[label];
  if (!route) {
    throw new Error(`Could not find navigation control for ${label}.`);
  }
  await page.goto(route);
  await page.waitForURL(new RegExp(`${route.replace("/", "\\/")}$`));
}
