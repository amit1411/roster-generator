"""Database helpers for shared scoring sessions."""

from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy import JSON, DateTime, Integer, String, create_engine, func
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
    """Analytics snapshot for a completed session."""

    __tablename__ = "completed_session_stats"

    session_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    session_name: Mapped[str] = mapped_column(String(120), nullable=False)
    draw_type: Mapped[str] = mapped_column(String(32), nullable=False)
    processed_version: Mapped[int] = mapped_column(Integer, nullable=False)
    total_matches: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_players: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    top_player: Mapped[str | None] = mapped_column(String(120), nullable=True)
    top_pair: Mapped[str | None] = mapped_column(String(240), nullable=True)
    champion_pair: Mapped[str | None] = mapped_column(String(240), nullable=True)
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
    """All-time aggregate stats across completed sessions."""

    __tablename__ = "player_stats_summary"

    player_name: Mapped[str] = mapped_column(String(120), primary_key=True)
    sessions_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    point_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_session_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)


engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db():
    """Create tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


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
