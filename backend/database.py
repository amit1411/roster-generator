"""Database helpers for shared scoring sessions."""

from __future__ import annotations

import os
from contextlib import contextmanager

from sqlalchemy import JSON, DateTime, Integer, String, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/badminton_roster",
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
