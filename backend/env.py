"""Environment loading helpers for local development."""

from __future__ import annotations

from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional until dependency install
    load_dotenv = None


def load_local_env():
    if load_dotenv is None:
        return
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(env_path, override=False)
