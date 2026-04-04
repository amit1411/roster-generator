import { expect } from "@playwright/test";

export async function navigateToSection(page, label) {
  const desktopButton = page.getByRole("button", { name: label, exact: true });
  if (await desktopButton.isVisible().catch(() => false)) {
    await desktopButton.click();
    return;
  }

  const mobileMenuButton = page.getByRole("button", { name: "Open navigation" });
  await expect(mobileMenuButton).toBeVisible();
  await mobileMenuButton.click();
  await page.getByRole("button", { name: label, exact: true }).click();
}
