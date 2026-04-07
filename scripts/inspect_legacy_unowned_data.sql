-- Inspect legacy data that was created before organizer login/workspaces existed.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/inspect_legacy_unowned_data.sql
--
-- What this shows:
-- - shared sessions with no workspace
-- - players with no workspace
-- - analytics rows still on the legacy empty workspace_id ('')
--
-- This script is read-only.

select
  'shared_sessions' as table_name,
  count(*) as orphaned_rows
from public.shared_sessions
where workspace_id is null

union all

select
  'players' as table_name,
  count(*) as orphaned_rows
from public.players
where workspace_id is null

union all

select
  'completed_session_stats' as table_name,
  count(*) as orphaned_rows
from public.completed_session_stats
where workspace_id = ''

union all

select
  'player_session_stats' as table_name,
  count(*) as orphaned_rows
from public.player_session_stats
where workspace_id = ''

union all

select
  'player_partner_session_stats' as table_name,
  count(*) as orphaned_rows
from public.player_partner_session_stats
where workspace_id = ''

union all

select
  'player_stats_summary' as table_name,
  count(*) as orphaned_rows
from public.player_stats_summary
where workspace_id = ''
order by table_name;

select
  session_id,
  name,
  created_at,
  updated_at
from public.shared_sessions
where workspace_id is null
order by updated_at desc, created_at desc
limit 50;

select
  player_id,
  full_name,
  short_name,
  source,
  created_at
from public.players
where workspace_id is null
order by full_name asc
limit 50;
