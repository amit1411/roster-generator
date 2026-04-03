"""Database helpers for shared scoring sessions."""

from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy import JSON, DateTime, Integer, String, create_engine, func, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def normalize_database_url(raw_url: str) -> str:
    """Force SQLAlchemy to use psycopg v3 for Postgres URLs."""
    if raw_url.startswith("postgresql+psycopg://"):
        return raw_url
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


DATABASE_URL = normalize_database_url(
    os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5433/badminton_roster",
    )
)


class Base(DeclarativeBase):
    """Base ORM model."""


class SharedSessionRecord(Base):
    """Persisted shared scoring session."""

    __tablename__ = "shared_sessions"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class PlayerRecord(Base):
    """Registered player directory entry."""

    __tablename__ = "players"

    player_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    short_name: Mapped[str] = mapped_column(String(60), nullable=False)
    normalized_full_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    normalized_short_name: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String(24), nullable=False, default="manual")
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SessionRoundRecord(Base):
    """Persisted per-round session state."""

    __tablename__ = "session_rounds"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    stage: Mapped[str] = mapped_column(String(16), primary_key=True)
    round_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    started: Mapped[bool] = mapped_column(default=False, nullable=False)
    ended: Mapped[bool] = mapped_column(default=False, nullable=False)


class SessionScoreRecord(Base):
    """Persisted per-court score entry."""

    __tablename__ = "session_scores"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    stage: Mapped[str] = mapped_column(String(16), primary_key=True)
    round_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    court_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_a_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    team_b_score: Mapped[int | None] = mapped_column(Integer, nullable=True)


class CompletedSessionStatsRecord(Base):
    """Persisted summary for completed sessions."""

    __tablename__ = "completed_session_stats"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    session_name: Mapped[str] = mapped_column(String(120), nullable=False)
    draw_type: Mapped[str] = mapped_column(String(32), nullable=False)
    total_players: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_matches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    champion_pair: Mapped[str | None] = mapped_column(String(240), nullable=True)
    top_player: Mapped[str | None] = mapped_column(String(120), nullable=True)
    processed_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    completed_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)


class PlayerSessionStatsRecord(Base):
    """Per-player stats for a completed session."""

    __tablename__ = "player_session_stats"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    player_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    session_name: Mapped[str] = mapped_column(String(120), nullable=False)
    draw_type: Mapped[str] = mapped_column(String(32), nullable=False)
    completed_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    championships: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PlayerPartnerSessionStatsRecord(Base):
    """Per-player/per-partner stats for a completed session."""

    __tablename__ = "player_partner_session_stats"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    player_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    partner_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PlayerStatsSummaryRecord(Base):
    """Aggregate stats across completed sessions."""

    __tablename__ = "player_stats_summary"

    player_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    sessions_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    league_point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    knockout_point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    championships: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_partner: Mapped[str | None] = mapped_column(String(120), nullable=True)
    best_partner_wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_partner_matches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_session_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)


engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

ANALYTICS_SCHEMA_UPDATES = {
    "players": [
        ("short_name", "VARCHAR(60)", "NOT NULL DEFAULT ''"),
        ("normalized_full_name", "VARCHAR(120)", "NOT NULL DEFAULT ''"),
        ("normalized_short_name", "VARCHAR(60)", "NOT NULL DEFAULT ''"),
        ("source", "VARCHAR(24)", "NOT NULL DEFAULT 'manual'"),
        ("created_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
        ("updated_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
    ],
    "completed_session_stats": [
        ("session_name", "VARCHAR(120)", "NOT NULL DEFAULT ''"),
        ("draw_type", "VARCHAR(32)", "NOT NULL DEFAULT 'round_robin'"),
        ("total_players", "INTEGER", "NOT NULL DEFAULT 0"),
        ("total_matches", "INTEGER", "NOT NULL DEFAULT 0"),
        ("champion_pair", "VARCHAR(240)", "NULL"),
        ("top_player", "VARCHAR(120)", "NULL"),
        ("processed_version", "INTEGER", "NOT NULL DEFAULT 1"),
        ("completed_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
    ],
    "player_session_stats": [
        ("session_name", "VARCHAR(120)", "NOT NULL DEFAULT ''"),
        ("draw_type", "VARCHAR(32)", "NOT NULL DEFAULT 'round_robin'"),
        ("completed_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
        ("matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("championships", "INTEGER", "NOT NULL DEFAULT 0"),
    ],
    "player_partner_session_stats": [
        ("matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
    ],
    "player_stats_summary": [
        ("sessions_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("league_point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_matches_played", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_losses", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_draws", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_points", "INTEGER", "NOT NULL DEFAULT 0"),
        ("knockout_point_difference", "INTEGER", "NOT NULL DEFAULT 0"),
        ("championships", "INTEGER", "NOT NULL DEFAULT 0"),
        ("best_partner", "VARCHAR(120)", "NULL"),
        ("best_partner_wins", "INTEGER", "NOT NULL DEFAULT 0"),
        ("best_partner_matches", "INTEGER", "NOT NULL DEFAULT 0"),
        ("last_session_at", "TIMESTAMP WITH TIME ZONE", "NULL"),
    ],
}


def _ensure_table_columns():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table_name, columns in ANALYTICS_SCHEMA_UPDATES.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type, column_clause in columns:
                if column_name in existing_columns:
                    continue
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        f"ADD COLUMN {column_name} {column_type} {column_clause}"
                    )
                )


def init_db():
    """Create tables if they do not exist."""
    Base.metadata.create_all(bind=engine)
    _ensure_table_columns()


@contextmanager
def get_db_session():
    """Yield a database session."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
