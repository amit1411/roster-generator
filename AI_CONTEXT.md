# AI Context

This file is for future AI chats/agents working in this repo. Read this first, then check [NEW-FEATURES.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/NEW-FEATURES.md).

## Product Shape

This app now has five top-level product areas:

1. Planner
- Select players from the managed player directory
- Create or remove fixed pairs
- Configure format/settings
- Generate a roster
- Start a new session with organizer-token gating

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
- Mobile uses a master/detail flow instead of long-page scrolling

5. Players
- Manage canonical players with `player_id`, full name, and short name
- Edit players while keeping IDs stable
- Soft-delete and restore players

## Frontend Map

- [App.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/App.jsx)
  - Main state orchestrator
  - Top-level app navigation
  - Planner wizard
  - Active Sessions / History / Player Stats / Players orchestration
  - Shared-session API integration
  - Wait-state UX for slow backend actions
  - Rename session dialog
  - Organizer token gating for session creation
  - Mobile menu behavior

- [ActiveSessionsPage.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/ActiveSessionsPage.jsx)
  - Live/in-progress session list
  - Open/copy/rename/delete actions

- [PlayersPage.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/PlayersPage.jsx)
  - Player directory management
  - Create/edit/delete flows
  - Delete confirmation with admin token

- [PlayerInput.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/PlayerInput.jsx)
  - Directory-driven planner selection
  - Tap-to-pair UX
  - Player search and empty states

- [HistoryPage.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/HistoryPage.jsx)
  - Completed sessions only
  - Results-first history UX

- [PlayerStatsPage.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/PlayerStatsPage.jsx)
  - Leaderboard/profile/partner stats
  - Mobile master/detail interaction

- [ScoringPage.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/ScoringPage.jsx)
  - Scoring UI
  - Matches / Bracket / Rankings / Results
  - Mobile-specific round action UX
  - Session header actions

- [ConfigPanel.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/ConfigPanel.jsx)
  - Planner settings
  - Round robin vs league + knockout setup

- [RosterTable.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/RosterTable.jsx)
  - Generated roster review
  - Collapsible helper sections

- [scoring.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/scoring.js)
  - Derived league standings
  - Knockout bracket derivation
  - Score helper functions

- [api.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/api.js)
  - All frontend API calls

- [uiCopy.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/content/uiCopy.js)
  - Centralized user-facing copy for major surfaces and dialogs

## Backend Map

- [app.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/app.py)
  - FastAPI routes
  - Shared session CRUD
  - Round lifecycle
  - Score updates and batch score flush
  - Rename session
  - Historical analytics generation
  - Player directory CRUD and soft-delete restore
  - Organizer-token-gated session creation
  - Cache invalidation
  - Legacy session hydration into normalized tables

- [database.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/database.py)
  - SQLAlchemy models
  - Engine/session setup
  - Playwright DB safety guard

- [cache.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/cache.py)
  - Optional Redis or in-memory caching
  - Namespace versioning for invalidation

- [env.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/env.py)
  - Local `.env` loading helper

- [roster_engine.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/roster_engine.py)
  - Constraint-based roster generation

## Important Current Decisions

- Session sharing is still query-param-based rather than route-based.
  - `?session=` for public/view links
  - `?edit=` for scorer access
- Top-level app sections are state-driven in one SPA; the URL does not change between Planner / Players / Active Sessions / History / Player Stats.
- Session creation requires `ADMIN_RECOVERY_TOKEN`.
  - The frontend remembers successful organizer auth locally on that device.
- Player identity is now first-class:
  - `players` table with stable `player_id`
  - planner uses registry selection instead of raw name entry
  - soft-deleted players can be restored by recreating the same player
- League standings are league-only.
  - Knockout matches decide the champion
  - Knockout results do not modify league rankings
- Planner is a wizard with clickable backward step navigation only:
  - Players & Pairs
  - Settings
  - Review & Start
- Generated rosters can become stale.
  - If players, pairs, or settings change after generation, `Start Session` is disabled until regenerate.
- Session rename is supported from:
  - Existing Sessions list
  - Scoring header
- Deleting a completed session removes it from History but preserves player analytics.
- Deleting a player is admin-token gated and can optionally delete historical analytics.

## Performance Notes

- Shared external free Postgres services can feel slow.
- The hottest writes were normalized away from the giant session JSON row:
  - round state now uses `session_rounds`
  - score updates now use `session_scores`
- Before `End Round`, pending score edits are batch-flushed in one request.
- Single score save returns a small ack instead of the full session payload.
- Slow operations now show frontend waiting states.
- Optional cache layer exists in [cache.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/cache.py).
  - `CACHE_BACKEND=memory` works locally without Redis
  - `CACHE_BACKEND=redis` uses `REDIS_URL`
  - `/api/generate`, sessions, players, history, and player stats use cache
- Backend loads `backend/.env` locally via [env.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/env.py), but real environment vars still win.

## Known Tradeoffs

- External free DBs are still slower than a co-located Render DB.
- Top-level navigation is not route-based, so browser back/forward and refresh are richer for sessions than for top-level sections.
- The app still uses token-based safeguards instead of real accounts/roles.
- Player stats are derived from completed sessions and legacy data migration has been incremental rather than a formal migration job.
- Local OCI deployment work was intentionally removed from the repo and should not be assumed to exist.

## Agent Working Rules

- Prefer [uiCopy.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/content/uiCopy.js) for user-facing text.
  - If you add or update page copy, dialog copy, empty states, or helper text, centralize it there instead of hardcoding strings inside components unless the text is truly tiny/local-only.
- For meaningful feature work, run verification before handing off.
  - Frontend-only UI changes: `cd frontend && npm run build`
  - Backend-only changes: `python3 -m py_compile backend/app.py backend/database.py backend/cache.py backend/env.py`
  - Main feature development that changes user flows should usually run E2E too:
    - desktop: `cd frontend && npm run test:e2e:full`
    - mobile for mobile-visible changes: `cd frontend && npm run test:e2e:mobile`
- If a change affects planner, scoring, history, players, player stats, or mobile navigation, assume E2E coverage matters unless there is a clear reason not to run it.
- When changing tests, keep using API-assisted setup where possible.
  - Prefer fast, focused UI assertions over long click-through setup.
- Do not reintroduce repo-local OCI deployment assumptions.
  - That work was removed and should stay out of future handoff context unless the user explicitly asks to bring it back.

## Suggested Starting Points For Future Work

- Product ideas: [NEW-FEATURES.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/NEW-FEATURES.md)
- Data model: [DATABASE_MODEL.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/DATABASE_MODEL.md)
- Tests: [TESTING.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/TESTING.md)

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

Build check:

```bash
cd frontend
npm run build
```

Backend syntax check:

```bash
python3 -m py_compile backend/app.py backend/database.py backend/cache.py backend/env.py
```
