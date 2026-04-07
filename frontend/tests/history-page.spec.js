import { expect, test } from "@playwright/test";
import { loginAsOrganizer, loginAsOrganizerWithCredentials } from "./helpers/auth";
import { navigateToSection } from "./helpers/navigation";
import {
  completeRoundRobinSession,
  createRoundRobinSession,
  signupAndLoginOrganizer,
  createSharedSession,
  postRoundAction,
  postScore,
  generateRoster,
} from "./helpers/session";

test("history shows only completed sessions while active sessions stay separate", async ({ page, request }, testInfo) => {
  const completedName = `History Complete ${testInfo.project.name}`;
  const activeName = `History Active ${testInfo.project.name}`;

  await completeRoundRobinSession(request, completedName);
  await createRoundRobinSession(request, activeName);

  await page.goto("/");
  await loginAsOrganizer(page);
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

test("organizer history stays isolated to the active organizer workspace", async ({ page, request }, testInfo) => {
  const organizerAHeaders = await signupAndLoginOrganizer(request, {
    email: `organizer-a-${testInfo.project.name}@example.com`,
    password: "organizer-pass-123",
    displayName: "Organizer A",
  });
  const organizerBHeaders = await signupAndLoginOrganizer(request, {
    email: `organizer-b-${testInfo.project.name}@example.com`,
    password: "organizer-pass-123",
    displayName: "Organizer B",
  });

  const organizerARoster = await generateRoster(request, {
    players: ["A1", "A2", "A3", "A4"],
  });
  const organizerBRoster = await generateRoster(request, {
    players: ["B1", "B2", "B3", "B4"],
  });

  const sessionA = await createSharedSession(request, {
    name: `Organizer A Complete ${testInfo.project.name}`,
    roster: organizerARoster,
    drawConfig: { draw_type: "round_robin", league_meetings: 1, knockout_qualifiers: 4 },
    headers: organizerAHeaders,
  });
  const sessionB = await createSharedSession(request, {
    name: `Organizer B Complete ${testInfo.project.name}`,
    roster: organizerBRoster,
    drawConfig: { draw_type: "round_robin", league_meetings: 1, knockout_qualifiers: 4 },
    headers: organizerBHeaders,
  });

  for (const session of [sessionA, sessionB]) {
    await postRoundAction(request, session.session_id, session.edit_token, "start-round", {
      stage: "league",
      round_index: 0,
    });
    await postScore(request, session.session_id, session.edit_token, {
      stage: "league",
      round_index: 0,
      court_index: 0,
      team_key: "teamA",
      value: 21,
    });
    await postScore(request, session.session_id, session.edit_token, {
      stage: "league",
      round_index: 0,
      court_index: 0,
      team_key: "teamB",
      value: 18,
    });
    await postRoundAction(request, session.session_id, session.edit_token, "end-round", {
      stage: "league",
      round_index: 0,
    });
  }

  await page.goto("/");
  await loginAsOrganizerWithCredentials(page, {
    email: `organizer-a-${testInfo.project.name}@example.com`,
    password: "organizer-pass-123",
  });
  await navigateToSection(page, "History");
  await expect(page.getByText(`Organizer A Complete ${testInfo.project.name}`)).toBeVisible();
  await expect(page.getByText(`Organizer B Complete ${testInfo.project.name}`)).toHaveCount(0);
});
