## TODO NEXT

- Real login/roles to replace temporary token-based organizer/admin safeguards
- Better top-level route persistence if the app eventually moves beyond state-only section navigation
- Safer/admin-friendly backfill or repair tooling for historical analytics on staging/prod

## BACKLOG

- Realtime sync with WebSockets
- Player replacement mid-session
- Dedicated migration/backfill command for completed-session analytics
- Richer completed-session detail / summary surfaces

## Completed Features

- View-only vs scorer links with `ADMIN_RECOVERY_TOKEN` fallback recovery access
- Tournament summary / results page
- Rename session from session list and scoring header
- Historical sessions page with completed sessions only
- Player stats page with completed-session analytics across league and knockout
- Active Sessions split away from Planner
- Player directory management
  - stable `player_id`
  - create/edit/delete
  - soft-delete restore on recreate
- Planner redesign
  - directory-driven player selection
  - tap-to-pair UX
  - stale roster detection before start
  - organizer-token check before session creation
- Mobile UX improvements
  - menu-based top-level navigation
  - player stats master/detail flow
- Optional caching layer
  - in-memory or Redis
- Expanded Playwright coverage
  - desktop and mobile
  - local isolated DB and opt-in staging runs
