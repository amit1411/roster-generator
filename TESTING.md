# Testing

## Main Checks

Frontend build:

```bash
cd frontend
npm run build
```

Backend syntax:

```bash
python3 -m py_compile backend/app.py backend/database.py backend/cache.py backend/env.py
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

Mobile suite:

```bash
cd frontend
npm run test:e2e:mobile
```

Run a specific test:

```bash
cd frontend
npm run test:e2e -- rename-session.spec.js
```

## Staging E2E

Playwright can also run against the staging deployment at:
- `https://roster-generator-oibn.onrender.com/`

Desktop staging run:

```bash
cd frontend
npm run test:e2e:staging
```

Staging smoke run:

```bash
cd frontend
npm run test:e2e:staging:smoke
```

Staging mobile run:

```bash
cd frontend
npm run test:e2e:staging:mobile
```

These staging commands:
- do not start local backend/frontend servers
- point both page navigation and API-assisted setup to the Render app
- are best run after the new code is deployed upstream
- may need `PLAYWRIGHT_ADMIN_TOKEN` set if staging/prod uses a non-default organizer token for session creation

Example:

```bash
cd frontend
PLAYWRIGHT_ADMIN_TOKEN=your_staging_token npm run test:e2e:staging:smoke
```

Important staging caveat:
- these tests create sessions, players, scores, and sometimes delete test-created data
- this is real staging data, not the temporary local SQLite database
- if you want a cleaner staging signal, prefer `test:e2e:staging:smoke` for routine checks

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
  - end the last league round
  - verify the whole session completes and lands on results
- [knockout-results.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/knockout-results.spec.js)
  - create a knockout session
  - complete league play and semifinals via API
  - start and end the final in the UI
  - verify the whole session completes and lands on results
- [history-page.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/history-page.spec.js)
  - create one completed session and one active session
  - verify History shows only completed sessions
  - verify Active Sessions excludes completed ones
- [history-delete-keeps-stats.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/history-delete-keeps-stats.spec.js)
  - delete a completed session from History
  - verify player analytics remain intact
- [player-stats.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/player-stats.spec.js)
  - create a completed session
  - verify Player Stats loads leaderboard/profile data from analytics tables
  - verify mobile leaderboard/detail flow works on iPhone and Android
- [player-management.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/player-management.spec.js)
  - create players
  - verify planner uses the directory-driven selection flow
  - verify organizer token gating when starting a session
- [player-edit.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/player-edit.spec.js)
  - edit player full/short name
  - verify stable player identity behavior
- [player-delete.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/player-delete.spec.js)
  - delete player with admin-token confirmation
  - recreate same player and verify soft-delete restore
  - verify planner/player-stats visibility after restore
- [planner-stepper.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/planner-stepper.spec.js)
  - verify planner allows backward step navigation only
- [planner-stale-roster.spec.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/planner-stale-roster.spec.js)
  - verify roster becomes stale after planner changes
  - verify session start is blocked until regenerate
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
- Playwright uses dedicated local test ports:
  - backend: `127.0.0.1:8010`
  - frontend: `127.0.0.1:4174`
  - This avoids accidentally reusing a local dev server on the default app ports.
- Local Playwright startup also sets `PLAYWRIGHT_TEST_MODE=1`.
  - Backend startup will refuse to run if that test mode points at a non-temporary database.
  - This is the main guard against polluting the developer's real local DB.
- Remote/staging runs are opt-in through environment-driven Playwright config.
  - `PLAYWRIGHT_REMOTE=1`
  - `PLAYWRIGHT_BASE_URL=...`
  - `PLAYWRIGHT_API_BASE_URL=...`
  - `PLAYWRIGHT_ADMIN_TOKEN=...` when the environment requires a non-default organizer token
- Playwright is configured with `workers: 1`.
  - The current E2E setup shares one temporary SQLite-backed backend instance.
  - Running tests in parallel can cause cross-test interference and flaky failures.
- Shared setup helpers live in:
  - [frontend/tests/helpers/session.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/helpers/session.js)
  - [frontend/tests/helpers/navigation.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/tests/helpers/navigation.js)
- If a test fails, check:
  - `frontend/test-results/`
  - Playwright error context output

## Suggested Next Coverage

- refresh/deep-link session open works on mobile as well as desktop
- player delete with `delete historical records` enabled
- cache-sensitive flows on staging/production-like data volume
- organizer token remembered across reload/new session creation flow
