# Database Model

## Current Tables

### `shared_sessions`

Canonical session metadata and slower-changing session data.

Fields:
- `session_id`
- `name`
- `data`
- `version`
- `created_at`
- `updated_at`

What stays in `data`:
- `roster`
- `draw_config`
- `edit_token`
- lightweight session metadata

What no longer belongs here for hot writes:
- per-court scores
- per-round started/ended state

### `session_rounds`

Per-round mutable state.

Primary key:
- `session_id`
- `stage`
- `round_index`

Fields:
- `started`
- `ended`

Stages:
- `league`
- `knockout`

### `session_scores`

Per-court score storage.

Primary key:
- `session_id`
- `stage`
- `round_index`
- `court_index`

Fields:
- `team_a_score`
- `team_b_score`

## Why This Split Exists

The old model stored all scores and round state inside `shared_sessions.data`.
That meant:
- every score update rewrote the whole session row
- `End Round` could contend on the same big JSON row
- external free Postgres services timed out more easily

The current split keeps:
- session metadata in `shared_sessions`
- hot score writes in `session_scores`
- hot round state writes in `session_rounds`

## Legacy Migration Behavior

Older sessions may still have score/round state inside `shared_sessions.data`.

Current backend behavior:
- when an old session is opened or mutated, the backend hydrates that legacy data into:
  - `session_rounds`
  - `session_scores`
- then strips those mutable keys from the stored JSON payload

This is a lazy migration strategy rather than a one-time migration script.

## Canonical Source Of Truth

- Session metadata: `shared_sessions`
- Round started/ended state: `session_rounds`
- Score values: `session_scores`
- Standings and bracket: derived, not stored as canonical tables

## Important Note

Frontend still expects the same API response shape:
- `league_scores_by_round`
- `active_league_round`
- `ended_league_rounds`
- `knockout_scores_by_round`
- `active_knockout_round`
- `ended_knockout_rounds`

Backend reconstructs that response shape from normalized tables.
