-- Claim all pre-login legacy data for one already-existing organizer account.
--
-- IMPORTANT
-- - Run this only after that organizer has already signed up at least once.
-- - Replace the \set values below before running.
-- - This preserves the data; it does not delete or truncate anything.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/claim_legacy_data_for_existing_user.sql
--
-- What this does:
-- 1. Finds the existing user by normalized email
-- 2. Finds or creates that user's personal workspace
-- 3. Ensures organizer role + workspace membership exist
-- 4. Moves legacy unowned data into that workspace
-- 5. Grants owner permission on migrated sessions
--
-- Notes:
-- - This script claims only rows that still look legacy/unowned:
--     shared_sessions.workspace_id IS NULL
--     players.workspace_id IS NULL
--     analytics workspace_id = ''
-- - If you want to split data between multiple accounts later, do NOT use this
--   catch-all script. Use more targeted UPDATE statements instead.

\set target_email 'replace-with-existing-organizer-email@example.com'
\set workspace_name 'Imported Legacy Workspace'

begin;

create temporary table _legacy_claim_context as
with target_user as (
  select
    user_id,
    normalized_email,
    display_name
  from public.users
  where normalized_email = lower(trim(:'target_email'))
),
existing_workspace as (
  select
    workspace_id
  from public.workspaces
  where owner_user_id = (select user_id from target_user)
  order by created_at asc, workspace_id asc
  limit 1
),
created_workspace as (
  insert into public.workspaces (
    workspace_id,
    owner_user_id,
    workspace_type,
    name
  )
  select
    'wks_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
    tu.user_id,
    'personal',
    nullif(trim(:'workspace_name'), '')
  from target_user tu
  where not exists (select 1 from existing_workspace)
  returning workspace_id
)
select
  tu.user_id,
  coalesce(
    (select workspace_id from existing_workspace),
    (select workspace_id from created_workspace)
  ) as workspace_id
from target_user tu;

do $$
begin
  if not exists (select 1 from _legacy_claim_context) then
    raise exception 'No existing user found for target_email=% . Sign up first, then rerun this script.', :'target_email';
  end if;
end
$$;

insert into public.user_roles (user_id, role)
select
  ctx.user_id,
  'organizer'
from _legacy_claim_context ctx
on conflict do nothing;

insert into public.workspace_memberships (workspace_id, user_id, role)
select
  ctx.workspace_id,
  ctx.user_id,
  'organizer'
from _legacy_claim_context ctx
on conflict do nothing;

update public.workspaces w
set
  name = coalesce(nullif(trim(:'workspace_name'), ''), w.name),
  workspace_type = 'personal'
from _legacy_claim_context ctx
where w.workspace_id = ctx.workspace_id
  and w.owner_user_id = ctx.user_id;

update public.shared_sessions s
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where s.workspace_id is null;

insert into public.session_permissions (session_id, user_id, permission)
select
  s.session_id,
  ctx.user_id,
  'owner'
from public.shared_sessions s
cross join _legacy_claim_context ctx
where s.workspace_id = ctx.workspace_id
on conflict do nothing;

update public.players p
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where p.workspace_id is null;

update public.completed_session_stats css
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where css.workspace_id = '';

update public.player_session_stats pss
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where pss.workspace_id = '';

update public.player_partner_session_stats ppss
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where ppss.workspace_id = '';

update public.player_stats_summary pss
set workspace_id = ctx.workspace_id
from _legacy_claim_context ctx
where pss.workspace_id = '';

select
  ctx.user_id,
  ctx.workspace_id,
  (select normalized_email from public.users where user_id = ctx.user_id) as normalized_email,
  (select name from public.workspaces where workspace_id = ctx.workspace_id) as workspace_name
from _legacy_claim_context ctx;

select
  'shared_sessions_mapped' as item,
  count(*) as row_count
from public.shared_sessions s
cross join _legacy_claim_context ctx
where s.workspace_id = ctx.workspace_id

union all

select
  'players_mapped' as item,
  count(*) as row_count
from public.players p
cross join _legacy_claim_context ctx
where p.workspace_id = ctx.workspace_id

union all

select
  'completed_session_stats_mapped' as item,
  count(*) as row_count
from public.completed_session_stats css
cross join _legacy_claim_context ctx
where css.workspace_id = ctx.workspace_id

union all

select
  'player_session_stats_mapped' as item,
  count(*) as row_count
from public.player_session_stats pss
cross join _legacy_claim_context ctx
where pss.workspace_id = ctx.workspace_id

union all

select
  'player_partner_session_stats_mapped' as item,
  count(*) as row_count
from public.player_partner_session_stats ppss
cross join _legacy_claim_context ctx
where ppss.workspace_id = ctx.workspace_id

union all

select
  'player_stats_summary_mapped' as item,
  count(*) as row_count
from public.player_stats_summary pss
cross join _legacy_claim_context ctx
where pss.workspace_id = ctx.workspace_id

order by item;

commit;
