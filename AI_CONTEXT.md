# AI Context

This file is for future AI chats/agents working in this repo. Read this first, then check [NEW-FEATURES.md](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/NEW-FEATURES.md).

## Product Shape

This app has two major flows:

1. Planner
- Generate a badminton roster
- Review it
- Start a named session

2. Session / Scoring
- Open an existing session by list or direct link
- Start rounds
- Enter scores
- End rounds
- View standings, bracket, and final results

## Frontend Map

- [App.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/App.jsx)
  - Main state orchestrator
  - Planner wizard
  - Session list and session loading
  - Shared-session API integration
  - Wait-state UX for slow backend actions
  - Rename session dialog

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

## Backend Map

- [app.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/app.py)
  - FastAPI routes
  - Shared session CRUD
  - Round lifecycle
  - Score updates and batch score flush
  - Rename session
  - Legacy session hydration into normalized tables

- [database.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/database.py)
  - SQLAlchemy models
  - Engine/session setup

- [roster_engine.py](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/backend/roster_engine.py)
  - Constraint-based roster generation

## Important Current Decisions

- Session sharing uses:
  - `session` query param for public/view links
  - `edit_token` for scorer access
- League standings are league-only.
  - Knockout matches decide the champion
  - Knockout results do not modify league rankings
- Planner is a wizard:
  - Players & Pairs
  - Settings
  - Review & Start
- Session creation now asks for a session name.
  - Default format is current date plus hour and minute
- Session rename is supported from:
  - Existing Sessions list
  - Scoring header

## Performance Notes

- Shared external free Postgres services can feel slow.
- The hottest writes were normalized away from the giant session JSON row:
  - round state now uses `session_rounds`
  - score updates now use `session_scores`
- Before `End Round`, pending score edits are batch-flushed in one request.
- Single score save returns a small ack instead of the full session payload.
- Slow operations now show frontend waiting states.

## Known Tradeoffs

- External free DBs are still slower than a co-located Render DB.
- `undo` is no longer the main editing model.
  - Per-round edit/reopen is the preferred path
- Shared sessions still use token-based edit access rather than full account/role management.
- Some historical auth discussion happened earlier, but the current codebase should be read from the files rather than assumed from old chat context.

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
python3 -m py_compile backend/app.py backend/database.py
```
