# Testing

## Main Checks

Frontend build:

```bash
cd frontend
npm run build
```

Backend syntax:

```bash
python3 -m py_compile backend/app.py backend/database.py
```

## Playwright

Playwright is configured in:
- [frontend/playwright.config.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/playwright.config.js)

Current script:

```bash
cd frontend
npm run test:e2e
```

Smoke suite:

```bash
cd frontend
npm run test:e2e:smoke
```

Full suite:

```bash
cd frontend
npm run test:e2e:full
```

Run a specific test:

```bash
cd frontend
npm run test:e2e -- rename-session.spec.js
```

## Current E2E Coverage

- [rename-session.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/rename-session.spec.js)
  - create session
  - rename from scoring view
  - rename again from session list
  - verify updated name persists
- [round-robin-round.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/round-robin-round.spec.js)
  - create a minimal round robin session
  - start the round
  - enter scores
  - end the round
  - verify the session lands on results
- [knockout-results.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/knockout-results.spec.js)
  - create a knockout session
  - complete league play and semifinals via API
  - start and end the final in the UI
  - verify the session lands on results
- [view-only-session.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/view-only-session.spec.js)
  - open a shared session without an edit token
  - verify the session is view-only
  - verify scoring controls stay disabled

## Recommended Flow

For day-to-day development:

```bash
cd frontend
npm run test:e2e:smoke
```

This should stay small and high-signal. Add tests here only for:
- golden-path workflows
- serious regressions that must never break again

For larger changes or before merging:

```bash
cd frontend
npm run test:e2e:full
```

## Test Strategy

- Prefer API-assisted setup for long workflows.
  - This keeps tests fast and less brittle.
  - Use UI interactions only for the user-facing step you actually want to verify.
- Keep a small smoke suite.
  - Fast confidence beats a huge flaky suite.
- Add one regression E2E test for every significant workflow bug you fix.
  - Example: knockout final completion.
- Keep pure UI assertions focused.
  - Verify the state the user cares about, not every implementation detail.

## Notes

- Playwright runs against a temporary SQLite database for isolation.
- This is useful for smoke coverage and avoids depending on local Postgres.
- Playwright is configured with `workers: 1`.
  - The current E2E setup shares one temporary SQLite-backed backend instance.
  - Running tests in parallel can cause cross-test interference and flaky failures.
- Shared setup helpers live in:
  - [frontend/tests/helpers/session.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/helpers/session.js)
- If a test fails, check:
  - `frontend/test-results/`
  - Playwright error context output

## Suggested Next Coverage

- rename session while already open in scoring and verify header update
- existing sessions list can reopen a live session
- refresh/deep-link session open works
- completed sessions/history flow if that feature stays on this branch
