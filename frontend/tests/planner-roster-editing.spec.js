import { expect, test } from "@playwright/test";
import { createPlayer } from "./helpers/session";

async function getRoundSnapshot(row) {
  const cellTexts = (await row.locator("td").allTextContents()).map((value) =>
    value.replace("Selected", "").replace(/\s+/g, " ").trim()
  );
  return {
    rowBody: cellTexts.slice(1),
    restText: cellTexts[cellTexts.length - 1] || "",
  };
}

function getTeamCell(row, index) {
  return row.locator("td").nth(index);
}

function getPlayerButton(teamCell, playerIndex) {
  return teamCell.getByRole("button").nth(playerIndex + 1);
}

async function clickTeamCard(teamCell) {
  await teamCell.getByRole("button", { name: /^Swap team / }).click({ position: { x: 12, y: 12 } });
}

test("planner uses selection-first player, team, and round swaps", async ({ page, request }) => {
  const players = [
    { fullName: "Swap Alpha", shortName: "SWA" },
    { fullName: "Swap Bravo", shortName: "SWB" },
    { fullName: "Swap Charlie", shortName: "SWC" },
    { fullName: "Swap Delta", shortName: "SWD" },
    { fullName: "Swap Echo", shortName: "SWE" },
  ];

  for (const player of players) {
    await createPlayer(request, player);
  }

  await page.goto("/");

  const searchInput = page.getByPlaceholder("Search players...");
  for (const player of players) {
    await searchInput.fill(player.shortName);
    const card = page.locator("section").filter({ hasText: player.fullName }).last();
    await card.getByRole("button", { name: "Add" }).first().click();
  }

  await page.getByRole("button", { name: "Next: Settings" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  await page.getByRole("button", { name: "Decrease Courts" }).click();
  for (let i = 0; i < 7; i += 1) {
    await page.getByRole("button", { name: "Decrease Rounds" }).click();
  }
  await page.getByRole("button", { name: "Next: Review" }).click();

  await page.getByRole("button", { name: "Generate Roster" }).click();
  await expect(page.getByText("Roster edits")).toBeVisible();
  await expect(page.getByText("Tap a player, team, or round to edit.").first()).toBeVisible();

  const firstRow = page.locator("table tbody tr").first();
  const teamACell = getTeamCell(firstRow, 2);
  const teamBCell = getTeamCell(firstRow, 3);

  await getPlayerButton(teamACell, 0).click();
  await expect(page.getByText(/Selected .*\./).first()).toBeVisible();
  await expect(page.getByText("Select another player in the same round or tap the same player again to cancel.").first()).toBeVisible();
  await getPlayerButton(teamBCell, 0).click();
  await expect(page.getByText("Edited roster")).toBeVisible();

  const firstRowBeforeTeamSwap = await getRoundSnapshot(firstRow);
  await clickTeamCard(getTeamCell(firstRow, 2));
  await expect(page.getByText(/Selected .*\./).first()).toBeVisible();
  await expect(page.getByText("Select another team in the same round or tap the same team again to cancel.").first()).toBeVisible();
  await clickTeamCard(getTeamCell(firstRow, 3));
  const firstRowAfterTeamSwap = await getRoundSnapshot(firstRow);
  expect(firstRowAfterTeamSwap.rowBody).not.toEqual(firstRowBeforeTeamSwap.rowBody);

  const firstRowBeforeRoundSwap = await getRoundSnapshot(page.locator("table tbody tr").nth(0));
  const secondRowBeforeRoundSwap = await getRoundSnapshot(page.locator("table tbody tr").nth(1));
  const roundButtons = page.locator("table tbody tr").locator("td:first-child").getByRole("button");
  await roundButtons.nth(0).click();
  await expect(page.getByText(/Selected Round 1\./).first()).toBeVisible();
  await roundButtons.nth(1).click();
  const firstRowAfterRoundSwap = await getRoundSnapshot(page.locator("table tbody tr").nth(0));
  expect(firstRowAfterRoundSwap.rowBody).toEqual(secondRowBeforeRoundSwap.rowBody);
  expect(firstRowAfterRoundSwap.restText).toBe(secondRowBeforeRoundSwap.restText);
  expect(firstRowAfterRoundSwap.rowBody).not.toEqual(firstRowBeforeRoundSwap.rowBody);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Regenerate Roster" }).click();
  await expect(page.getByText("Edited roster")).toHaveCount(0);
});
