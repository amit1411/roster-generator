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

## Notes

- Playwright runs against a temporary SQLite database for isolation.
- This is useful for smoke coverage and avoids depending on local Postgres.
- If a test fails, check:
  - `frontend/test-results/`
  - Playwright error context output

## Suggested Next Coverage

- score and end one round
- open view-only session link
- complete session and land on results view
- rename session while already open in scoring and verify header update
