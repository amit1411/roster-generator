# Frontend

This frontend is a React + Vite SPA for the Badminton Session Planner.

## Current Architecture

### Routing

The app now uses `react-router-dom` with URL-backed routes:

- `/planner`
- `/players`
- `/sessions`
- `/history`
- `/stats`
- `/sessions/:sessionId`

Legacy shared links such as `/?session=...&edit=...` are still supported and redirect into the scoring route.

### App structure

- [src/App.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/App.jsx)
  - Thin app orchestrator
  - Route composition
  - App shell wiring
  - Global dialogs and page-level banners
- [src/components/AppShell.jsx](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/components/AppShell.jsx)
  - Header and navigation shell
- [src/routes](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/routes)
  - Route wrappers for each top-level surface
- [src/hooks](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/hooks)
  - Domain hooks for planner, players, sessions, stats, scoring, and timing

### Domain hooks

- `usePlannerState`
- `usePlayersData`
- `useSessionsData`
- `usePlayerStatsData`
- `useScoringSession`
- `useSessionTiming`
- `appStateUtils` for shared route/storage/normalization helpers

## Current UX Notes

- Planner uses a three-step flow:
  - Players & Pairs
  - Settings
  - Review & Start
- Generated rosters can be manually edited before session start.
  - Editing is selection-first, not toolbar-mode-first.
  - Resting-player editing is intentionally out of scope.
- Error handling is scoped by domain.
  - Planner errors stay in planner.
  - Player CRUD errors stay in their relevant form/dialog.
  - Rename/organizer errors stay in dialogs.
  - App-level banner is for page-level session/stats failures.

## Copy Rules

Use [src/content/uiCopy.js](/Users/amit.agarwal/Documents/WBD_Repos/badminton-roster/frontend/src/content/uiCopy.js) for user-facing text whenever possible.

That includes:
- page copy
- helper text
- dialog copy
- empty states
- error/feedback labels

Avoid adding new hardcoded user-facing strings directly inside route/components unless the text is truly tiny and hyper-local.

## Repo-Local Skills

This repo also contains local AI skills in the root `.agents` directory:

- `.agents/skills/frontend-design`
- `.agents/skills/vercel-react-best-practices`

Those are especially relevant for:
- UI polishing
- React refactors
- hook/state cleanup
- rendering/performance improvements

## Commands

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Desktop E2E:

```bash
npm run test:e2e:full
```

Mobile E2E:

```bash
npm run test:e2e:mobile
```

Do not run full desktop and full mobile suites in parallel; the local Playwright setup shares a temp backend/database and can collide.
