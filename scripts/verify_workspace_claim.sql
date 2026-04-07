-- Verify which workspace/account currently owns data after a legacy-data claim.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/verify_workspace_claim.sql
--
-- Optional:
--   replace the \set target_email below if you want a one-account view.

\set target_email 'replace-with-existing-organizer-email@example.com'

select
  u.user_id,
  u.normalized_email,
  u.display_name,
  w.workspace_id,
  w.name as workspace_name,
  w.workspace_type,
  wm.role
from public.users u
left join public.workspace_memberships wm
  on wm.user_id = u.user_id
left join public.workspaces w
  on w.workspace_id = wm.workspace_id
where u.normalized_email = lower(trim(:'target_email'))
order by w.created_at asc nulls last, w.workspace_id asc;

select
  w.workspace_id,
  w.name as workspace_name,
  count(distinct s.session_id) as sessions,
  count(distinct p.player_id) as players,
  count(distinct css.session_id) as completed_sessions,
  count(distinct pss.player_name) as stats_players
from public.workspaces w
left join public.shared_sessions s
  on s.workspace_id = w.workspace_id
left join public.players p
  on p.workspace_id = w.workspace_id
left join public.completed_session_stats css
  on css.workspace_id = w.workspace_id
left join public.player_stats_summary pss
  on pss.workspace_id = w.workspace_id
group by w.workspace_id, w.name
order by w.name asc, w.workspace_id asc;
