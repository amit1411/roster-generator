-- Sync prod DB into staging DB for this badminton-roster schema.
--
-- IMPORTANT:
-- - Run this while connected to the staging database: defaultdb
-- - Source/prod database is: badmintonrosterstg
-- - This script overwrites staging data in the listed tables
-- - Replace the placeholders in the dblink connection string before running
--
-- Why dblink?
-- PostgreSQL cannot normally query another database in the same server with
-- plain SQL. The dblink extension opens a second connection from the current
-- database to the source database, then lets us SELECT from it.

begin;

do $$
begin
  if current_database() <> 'defaultdb' then
    raise exception 'Safety stop: this script must be run only against staging database defaultdb. Current database: %', current_database();
  end if;
end
$$;

create extension if not exists dblink;

-- Optional safety backup inside staging before overwrite.
create schema if not exists backup_sync;

drop table if exists backup_sync.shared_sessions_bak;
create table backup_sync.shared_sessions_bak as table public.shared_sessions;

drop table if exists backup_sync.players_bak;
create table backup_sync.players_bak as table public.players;

drop table if exists backup_sync.session_rounds_bak;
create table backup_sync.session_rounds_bak as table public.session_rounds;

drop table if exists backup_sync.session_scores_bak;
create table backup_sync.session_scores_bak as table public.session_scores;

drop table if exists backup_sync.completed_session_stats_bak;
create table backup_sync.completed_session_stats_bak as table public.completed_session_stats;

drop table if exists backup_sync.player_session_stats_bak;
create table backup_sync.player_session_stats_bak as table public.player_session_stats;

drop table if exists backup_sync.player_partner_session_stats_bak;
create table backup_sync.player_partner_session_stats_bak as table public.player_partner_session_stats;

drop table if exists backup_sync.player_stats_summary_bak;
create table backup_sync.player_stats_summary_bak as table public.player_stats_summary;

-- Replace these placeholders:
-- HOST = your PostgreSQL host
-- PORT = your PostgreSQL port, usually 5432
-- USER = your PostgreSQL username
-- PASSWORD = your PostgreSQL password
--
-- Even though both DBs are on the same PostgreSQL server, dblink still needs
-- a second connection to badmintonrosterstg, so you normally still provide
-- connection details here.
--
-- Enter the connection string once below, then the script reuses it.

select dblink_connect(
  'prod_sync',
  'host=badminton-roster-badminton-roster.i.aivencloud.com port=13485 dbname=badmintonrosterstg user=avnadmin password='
);

truncate table
  public.player_partner_session_stats,
  public.player_session_stats,
  public.player_stats_summary,
  public.completed_session_stats,
  public.session_scores,
  public.session_rounds,
  public.shared_sessions,
  public.players;

insert into public.shared_sessions (
  session_id, name, data, version, created_at, updated_at
)
select *
from dblink(
  'prod_sync',
  'select session_id, name, data, version, created_at, updated_at from public.shared_sessions'
) as t(
  session_id varchar(32),
  name varchar(120),
  data json,
  version integer,
  created_at timestamptz,
  updated_at timestamptz
);

insert into public.players (
  player_id, full_name, short_name, normalized_full_name, normalized_short_name,
  aliases, is_deleted, deleted_at, source, created_at, updated_at
)
select *
from dblink(
  'prod_sync',
  'select player_id, full_name, short_name, normalized_full_name, normalized_short_name, aliases, is_deleted, deleted_at, source, created_at, updated_at from public.players'
) as t(
  player_id varchar(32),
  full_name varchar(120),
  short_name varchar(60),
  normalized_full_name varchar(120),
  normalized_short_name varchar(60),
  aliases json,
  is_deleted boolean,
  deleted_at timestamptz,
  source varchar(24),
  created_at timestamptz,
  updated_at timestamptz
);

insert into public.session_rounds (
  session_id, stage, round_index, started, ended
)
select *
from dblink(
  'prod_sync',
  'select session_id, stage, round_index, started, ended from public.session_rounds'
) as t(
  session_id varchar(32),
  stage varchar(16),
  round_index integer,
  started boolean,
  ended boolean
);

insert into public.session_scores (
  session_id, stage, round_index, court_index, team_a_score, team_b_score
)
select *
from dblink(
  'prod_sync',
  'select session_id, stage, round_index, court_index, team_a_score, team_b_score from public.session_scores'
) as t(
  session_id varchar(32),
  stage varchar(16),
  round_index integer,
  court_index integer,
  team_a_score integer,
  team_b_score integer
);

insert into public.completed_session_stats (
  session_id, session_name, draw_type, total_players, total_matches,
  champion_pair, top_player, processed_version, completed_at
)
select *
from dblink(
  'prod_sync',
  'select session_id, session_name, draw_type, total_players, total_matches, champion_pair, top_player, processed_version, completed_at from public.completed_session_stats'
) as t(
  session_id varchar(32),
  session_name varchar(120),
  draw_type varchar(32),
  total_players integer,
  total_matches integer,
  champion_pair varchar(240),
  top_player varchar(120),
  processed_version integer,
  completed_at timestamptz
);

insert into public.player_session_stats (
  session_id, player_name, session_name, draw_type, completed_at,
  matches_played, wins, losses, draws, points, point_difference,
  league_matches_played, league_wins, league_losses, league_draws, league_points, league_point_difference,
  knockout_matches_played, knockout_wins, knockout_losses, knockout_draws, knockout_points, knockout_point_difference,
  championships
)
select *
from dblink(
  'prod_sync',
  'select session_id, player_name, session_name, draw_type, completed_at, matches_played, wins, losses, draws, points, point_difference, league_matches_played, league_wins, league_losses, league_draws, league_points, league_point_difference, knockout_matches_played, knockout_wins, knockout_losses, knockout_draws, knockout_points, knockout_point_difference, championships from public.player_session_stats'
) as t(
  session_id varchar(32),
  player_name varchar(120),
  session_name varchar(120),
  draw_type varchar(32),
  completed_at timestamptz,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  points integer,
  point_difference integer,
  league_matches_played integer,
  league_wins integer,
  league_losses integer,
  league_draws integer,
  league_points integer,
  league_point_difference integer,
  knockout_matches_played integer,
  knockout_wins integer,
  knockout_losses integer,
  knockout_draws integer,
  knockout_points integer,
  knockout_point_difference integer,
  championships integer
);

insert into public.player_partner_session_stats (
  session_id, player_name, partner_name, matches_played, wins, losses, draws, points, point_difference
)
select *
from dblink(
  'prod_sync',
  'select session_id, player_name, partner_name, matches_played, wins, losses, draws, points, point_difference from public.player_partner_session_stats'
) as t(
  session_id varchar(32),
  player_name varchar(120),
  partner_name varchar(120),
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  points integer,
  point_difference integer
);

insert into public.player_stats_summary (
  player_name, sessions_played, matches_played, wins, losses, draws, points, point_difference,
  league_matches_played, league_wins, league_losses, league_draws, league_points, league_point_difference,
  knockout_matches_played, knockout_wins, knockout_losses, knockout_draws, knockout_points, knockout_point_difference,
  championships, best_partner, best_partner_wins, best_partner_matches, last_session_at
)
select *
from dblink(
  'prod_sync',
  'select player_name, sessions_played, matches_played, wins, losses, draws, points, point_difference, league_matches_played, league_wins, league_losses, league_draws, league_points, league_point_difference, knockout_matches_played, knockout_wins, knockout_losses, knockout_draws, knockout_points, knockout_point_difference, championships, best_partner, best_partner_wins, best_partner_matches, last_session_at from public.player_stats_summary'
) as t(
  player_name varchar(120),
  sessions_played integer,
  matches_played integer,
  wins integer,
  losses integer,
  draws integer,
  points integer,
  point_difference integer,
  league_matches_played integer,
  league_wins integer,
  league_losses integer,
  league_draws integer,
  league_points integer,
  league_point_difference integer,
  knockout_matches_played integer,
  knockout_wins integer,
  knockout_losses integer,
  knockout_draws integer,
  knockout_points integer,
  knockout_point_difference integer,
  championships integer,
  best_partner varchar(120),
  best_partner_wins integer,
  best_partner_matches integer,
  last_session_at timestamptz
);

select dblink_disconnect('prod_sync');

commit;

-- Optional verification query after the sync:
--
-- select 'shared_sessions' as table_name, count(*) from public.shared_sessions
-- union all
-- select 'players', count(*) from public.players
-- union all
-- select 'session_rounds', count(*) from public.session_rounds
-- union all
-- select 'session_scores', count(*) from public.session_scores
-- union all
-- select 'completed_session_stats', count(*) from public.completed_session_stats
-- union all
-- select 'player_session_stats', count(*) from public.player_session_stats
-- union all
-- select 'player_partner_session_stats', count(*) from public.player_partner_session_stats
-- union all
-- select 'player_stats_summary', count(*) from public.player_stats_summary
-- order by 1;
