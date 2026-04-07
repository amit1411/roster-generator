# AI Context

This file is for future AI chats/agents working in this repo. Read this first, then check [NEW-FEATURES.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/NEW-FEATURES.md), [TESTING.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/TESTING.md), and any relevant repo-local skills under [.agents](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/.agents).

## Product Shape

This app currently has five main product areas:

1. Planner
- Select players from the managed player directory
- Create fixed pairs
- Configure session format/settings
- Generate a roster preview
- Manually edit the preview with selection-first swaps before starting a session
  - player swap within a round
  - team swap within a round
  - round swap across rounds
- Revalidate edited rosters before session creation

2. Active Sessions
- Reopen in-progress sessions
- Copy view/scorer links
- Rename or delete sessions

3. History
- View completed sessions only
- Open final results
- Delete completed sessions without automatically deleting player analytics

4. Player Stats
- View completed-session analytics across league and knockout play
- Mobile uses a master/detail flow

5. Players
- Manage canonical players with stable `player_id`, full name, and short name
- Edit players while keeping IDs stable
- Soft-delete and restore players

## Current Frontend Architecture

The frontend is a React + Vite SPA with URL-backed routing via `react-router-dom`.

### Routing

- Top-level routes:
  - `/planner`
  - `/players`
  - `/sessions`
  - `/history`
  - `/stats`
  - `/sessions/:sessionId`
- Legacy shared links are still supported:
  - `/?session=...&edit=...` redirects into `/sessions/:sessionId?edit=...`
- Browser back/forward now matters and is tested.

### App structure

- [frontend/src/App.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/App.jsx)
  - Thin orchestrator
  - Router composition
  - App shell wiring
  - Global dialogs and page-level banner handling
- [frontend/src/components/AppShell.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/AppShell.jsx)
  - Header
  - Desktop/mobile navigation
  - Shared page shell
- [frontend/src/routes](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/routes)
  - Route wrappers for Planner, Players, Active Sessions, History, Player Stats, and Scoring

### Domain hooks

Shared app logic was intentionally peeled out of `App.jsx` into focused hooks:

- [usePlannerState.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/usePlannerState.js)
  - Planner draft state
  - Roster generation
  - Roster stale detection
  - Manual roster editing state
  - Planner-scoped errors
- [usePlayersData.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/usePlayersData.js)
  - Player directory loading
  - Create/edit/delete
  - Action-scoped player errors
- [useSessionsData.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/useSessionsData.js)
  - Active/history session lists
  - Session access persistence
  - Rename/share/delete
  - Organizer token dialog
  - Session page-level errors
- [usePlayerStatsData.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/usePlayerStatsData.js)
  - Stats list/detail loading
  - Player-stats page errors
- [useScoringSession.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/useScoringSession.js)
  - Route-driven shared-session load
  - Polling
  - Round lifecycle
  - Optimistic scoring
  - Scoring page-level errors
- [useSessionTiming.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/useSessionTiming.js)
  - Generation/session wait timers

### Shared frontend utilities

- [frontend/src/hooks/appStateUtils.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks/appStateUtils.js)
  - Route helpers
  - Storage keys/helpers
  - Session normalization
  - Planner roster swap helpers

## Current UX Decisions That Matter

- Planner editing is selection-first, not mode-toolbar-driven.
  - First tap chooses the edit type implicitly.
  - Player/team swaps are same-round only.
  - Resting-player edits are intentionally out of scope.
- Round swapping on mobile:
  - expand/collapse is separate from swap
  - `Swap` is visible on collapsed rounds
  - once a round is selected, tapping another round header completes the swap
- Regenerating a roster after manual edits prompts the user and discards edits.
- Error handling is now scoped:
  - planner errors stay in planner
  - player CRUD errors stay in the relevant form/dialog
  - rename/organizer errors stay in dialogs
  - app-level banner is reserved for page-level session/stats failures
- User-facing error copy should come from [uiCopy.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/content/uiCopy.js).

## Backend Map

- [backend/app.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/app.py)
  - FastAPI routes
  - Shared session CRUD
  - Round lifecycle
  - Score updates and batch score flush
  - Rename session
  - Player directory CRUD and soft-delete restore
  - Organizer-token-gated session creation
  - Edited-roster revalidation before session creation
- [backend/roster_engine.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/roster_engine.py)
  - Constraint-based roster generation
  - Pair/rest validation support used by roster generation/revalidation
- [backend/database.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/database.py)
  - SQLAlchemy models
  - Engine/session setup
  - Playwright DB safety guard
- [backend/cache.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/cache.py)
  - Optional Redis or in-memory caching
- [backend/env.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/env.py)
  - Local `.env` loading helper

## Important Current Decisions

- The app is still an SPA, but routing is now URL-first instead of local view-state-first.
- Session sharing is path + query based:
  - `/sessions/:sessionId`
  - optional `?edit=...` scorer token
  - legacy query-only links still redirect
- Session creation still requires organizer-token gating rather than user auth.
- League standings are league-only.
  - Knockout determines the champion
  - Knockout does not mutate league rankings
- Generated rosters can become stale.
  - If players, pairs, or settings change after generation, `Start Session` is disabled until regenerate.
- Manual roster edits are revalidated server-side before session creation.
- Player identity is first-class and history-safe:
  - stable `player_id`
  - soft-delete/restore
  - analytics preserved unless explicitly removed

## Repo-Local AI Skills

This repo now has a local `.agents` directory with reusable skills:

- [.agents/skills/frontend-design/SKILL.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/.agents/skills/frontend-design/SKILL.md)
  - Use for deliberate, higher-quality frontend visual work
- [.agents/skills/vercel-react-best-practices/SKILL.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/.agents/skills/vercel-react-best-practices/SKILL.md)
  - Use for React refactors, rendering/perf work, hook cleanup, and state architecture
- [.agents/skills/vercel-react-best-practices/AGENTS.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/.agents/skills/vercel-react-best-practices/AGENTS.md)
  - Expanded reference for the Vercel skill

Future AI agents should check whether a task matches one of these before doing major UI or React refactor work.

## Agent Working Rules

- Prefer [uiCopy.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/content/uiCopy.js) for user-facing copy.
  - This now includes error/feedback copy, not just page copy.
- For React/frontend refactors, prefer the route + hook architecture that already exists.
  - Do not collapse everything back into `App.jsx`.
- Keep API calls centralized in [frontend/src/api.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/api.js).
- If you touch route behavior, planner editing, scoring, players, stats, or mobile navigation, assume E2E coverage matters.
- Run verification before handing off meaningful changes.
  - Frontend-only UI/state changes: `cd frontend && npm run build`
  - Backend syntax: `python3 -m py_compile backend/app.py backend/database.py backend/cache.py backend/env.py`
  - Larger user-flow changes:
    - desktop: `cd frontend && npm run test:e2e:full`
    - mobile when mobile-visible: `cd frontend && npm run test:e2e:mobile`
- Do not run desktop and mobile full suites in parallel.
  - The local Playwright setup uses a shared temp DB/backend and parallel suite execution can collide.

## Suggested Starting Points For Future Work

- Product ideas: [NEW-FEATURES.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/NEW-FEATURES.md)
- Data model: [DATABASE_MODEL.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/DATABASE_MODEL.md)
- Tests: [TESTING.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/TESTING.md)
- Frontend setup: [frontend/README.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/README.md)

## Good Commands

Backend:

```bash
cd backend
source venv/bin/activate
uvicorn app:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm run dev
```

Frontend build:

```bash
cd frontend
npm run build
```

Backend syntax:

```bash
python3 -m py_compile backend/app.py backend/database.py backend/cache.py backend/env.py
```
