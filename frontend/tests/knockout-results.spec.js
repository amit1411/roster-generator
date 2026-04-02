import { expect, test } from "@playwright/test";
import {
  createKnockoutSession,
  openSession,
  postRoundAction,
  postScore,
} from "./helpers/session";
test("@smoke ending the final knockout round should complete the session and show results", async ({ page, request }) => {
  const session = await createKnockoutSession(request, "Knockout Finish Repro");
  const { session_id: sessionId, edit_token: editToken } = session;

  await postRoundAction(request, sessionId, editToken, "start-round", { stage: "league", round_index: 0 });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 0,
    team_key: "teamB",
    value: 10,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 1,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "league",
    round_index: 0,
    court_index: 1,
    team_key: "teamB",
    value: 9,
  });
  await postRoundAction(request, sessionId, editToken, "end-round", { stage: "league", round_index: 0 });

  await postRoundAction(request, sessionId, editToken, "start-round", { stage: "knockout", round_index: 0 });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 0,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 0,
    team_key: "teamB",
    value: 18,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 1,
    team_key: "teamA",
    value: 21,
  });
  await postScore(request, sessionId, editToken, {
    stage: "knockout",
    round_index: 0,
    court_index: 1,
    team_key: "teamB",
    value: 17,
  });
  await postRoundAction(request, sessionId, editToken, "end-round", { stage: "knockout", round_index: 0 });

  await openSession(page, sessionId, editToken);
  await expect(page.getByText("Upcoming Knockout Rounds")).toBeVisible();
  await page.getByText("Upcoming Knockout Rounds").click();
  await page.getByRole("button", { name: "Start Round" }).click();
  const liveInputs = page.locator('input[type="number"]:not([disabled])');
  await liveInputs.nth(0).fill("21");
  await liveInputs.nth(1).fill("19");
  await page.getByRole("button", { name: /End Round/ }).first().click();

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible({ timeout: 15000 });
});
