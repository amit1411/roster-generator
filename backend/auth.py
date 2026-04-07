"""Authentication helpers for API routes."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select

from database import (
    AuthIdentityRecord,
    AuthSessionRecord,
    SessionPermissionRecord,
    UserRecord,
    UserRoleRecord,
    WorkspaceMembershipRecord,
    WorkspaceRecord,
)
from env import load_local_env

load_local_env()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
AUTH_SESSION_DAYS = int(os.getenv("AUTH_SESSION_DAYS", "30"))

def normalize_email(email: str) -> str:
    return " ".join(email.strip().lower().split())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(8)}"


def _workspace_name_for_user(display_name: str) -> str:
    cleaned = " ".join(display_name.strip().split()) or "Organizer"
    return f"{cleaned}'s Workspace"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
    )
    return "scrypt$%s$%s" % (
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(password_hash).decode("ascii"),
    )


def verify_password(password: str, stored_value: str) -> bool:
    try:
        algorithm, salt_b64, hash_b64 = stored_value.split("$", 2)
    except ValueError:
        return False

    if algorithm != "scrypt":
        return False

    salt = base64.b64decode(salt_b64.encode("ascii"))
    expected_hash = base64.b64decode(hash_b64.encode("ascii"))
    actual_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
    )
    return hmac.compare_digest(actual_hash, expected_hash)


def _get_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    return token or None


def get_current_user(request: Request, db, *, required: bool = False) -> UserRecord | None:
    token = _get_bearer_token(request)
    if not token:
        if required:
            raise HTTPException(status_code=401, detail="Login required")
        return None

    session = db.scalar(
        select(AuthSessionRecord).where(AuthSessionRecord.token_hash == _hash_token(token))
    )
    if not session:
        if required:
            raise HTTPException(status_code=401, detail="Login required")
        return None

    expires_at = _coerce_utc(session.expires_at)
    if expires_at and expires_at <= _utc_now():
        db.delete(session)
        if required:
            raise HTTPException(status_code=401, detail="Session expired")
        return None

    user = db.get(UserRecord, session.user_id)
    if not user or not user.is_active:
        if required:
            raise HTTPException(status_code=401, detail="Login required")
        return None

    session.last_seen_at = _utc_now()
    db.add(session)
    return user


def get_current_auth_session(request: Request, db) -> AuthSessionRecord | None:
    token = _get_bearer_token(request)
    if not token:
        return None

    return db.scalar(
        select(AuthSessionRecord).where(AuthSessionRecord.token_hash == _hash_token(token))
    )


def get_user_roles(db, user_id: str) -> set[str]:
    return {
        row.role
        for row in db.scalars(select(UserRoleRecord).where(UserRoleRecord.user_id == user_id)).all()
    }


def get_user_workspace_memberships(db, user_id: str) -> list[tuple[WorkspaceRecord, str]]:
    memberships = db.scalars(
        select(WorkspaceMembershipRecord).where(WorkspaceMembershipRecord.user_id == user_id)
    ).all()

    results = []
    for membership in memberships:
        workspace = db.get(WorkspaceRecord, membership.workspace_id)
        if workspace:
            results.append((workspace, membership.role))
    return sorted(results, key=lambda item: (item[0].created_at or _utc_now(), item[0].workspace_id))


def _ensure_global_organizer_role(db, user_id: str):
    existing = db.get(UserRoleRecord, (user_id, "organizer"))
    if existing:
        return existing

    role = UserRoleRecord(user_id=user_id, role="organizer")
    db.add(role)
    return role


def ensure_default_workspace(db, user: UserRecord) -> WorkspaceRecord:
    existing = db.scalar(
        select(WorkspaceRecord).where(WorkspaceRecord.owner_user_id == user.user_id)
    )
    if existing:
        membership = db.get(
            WorkspaceMembershipRecord,
            (existing.workspace_id, user.user_id, "organizer"),
        )
        if not membership:
            db.add(
                WorkspaceMembershipRecord(
                    workspace_id=existing.workspace_id,
                    user_id=user.user_id,
                    role="organizer",
                )
            )
        _ensure_global_organizer_role(db, user.user_id)
        return existing

    workspace = WorkspaceRecord(
        workspace_id=_generate_id("wks"),
        owner_user_id=user.user_id,
        workspace_type="personal",
        name=_workspace_name_for_user(user.display_name),
    )
    db.add(workspace)
    db.flush()
    db.add(
        WorkspaceMembershipRecord(
            workspace_id=workspace.workspace_id,
            user_id=user.user_id,
            role="organizer",
        )
    )
    _ensure_global_organizer_role(db, user.user_id)
    return workspace


def get_active_workspace(db, user: UserRecord, auth_session: AuthSessionRecord | None = None) -> WorkspaceRecord | None:
    memberships = get_user_workspace_memberships(db, user.user_id)
    if not memberships:
        return ensure_default_workspace(db, user)

    allowed_workspace_ids = {workspace.workspace_id for workspace, _ in memberships}
    active_workspace = None
    if auth_session and auth_session.active_workspace_id in allowed_workspace_ids:
        active_workspace = db.get(WorkspaceRecord, auth_session.active_workspace_id)

    if not active_workspace:
        active_workspace = memberships[0][0]
        if auth_session:
            auth_session.active_workspace_id = active_workspace.workspace_id
            db.add(auth_session)

    return active_workspace


def switch_active_workspace(db, user: UserRecord, auth_session: AuthSessionRecord, workspace_id: str) -> WorkspaceRecord:
    memberships = {workspace.workspace_id: workspace for workspace, _ in get_user_workspace_memberships(db, user.user_id)}
    workspace = memberships.get(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    auth_session.active_workspace_id = workspace.workspace_id
    db.add(auth_session)
    return workspace


def get_workspace_roles(db, user_id: str, workspace_id: str | None) -> set[str]:
    if not workspace_id:
        return set()
    return {
        membership.role
        for membership in db.scalars(
            select(WorkspaceMembershipRecord).where(
                WorkspaceMembershipRecord.user_id == user_id,
                WorkspaceMembershipRecord.workspace_id == workspace_id,
            )
        ).all()
    }


def require_organizer(request: Request, db) -> tuple[UserRecord, WorkspaceRecord, set[str]]:
    user = get_current_user(request, db, required=True)
    auth_session = get_current_auth_session(request, db)
    workspace = get_active_workspace(db, user, auth_session)
    roles = get_workspace_roles(db, user.user_id, workspace.workspace_id if workspace else None)
    if "organizer" not in roles:
        raise HTTPException(status_code=403, detail="Organizer access required")
    return user, workspace, roles


def serialize_workspace(db, workspace: WorkspaceRecord | None, *, user_id: str | None = None) -> dict | None:
    if not workspace:
        return None
    roles = sorted(get_workspace_roles(db, user_id, workspace.workspace_id)) if user_id else []
    return {
        "workspace_id": workspace.workspace_id,
        "name": workspace.name,
        "workspace_type": workspace.workspace_type,
        "roles": roles,
        "is_organizer": "organizer" in roles,
    }


def serialize_user(db, user: UserRecord, *, active_workspace: WorkspaceRecord | None = None) -> dict:
    if not active_workspace:
        active_workspace = ensure_default_workspace(db, user)
    roles = sorted(get_workspace_roles(db, user.user_id, active_workspace.workspace_id if active_workspace else None))
    return {
        "user_id": user.user_id,
        "email": user.primary_email,
        "display_name": user.display_name,
        "roles": roles,
        "is_organizer": "organizer" in roles,
    }


def create_auth_session(db, user: UserRecord) -> tuple[str, AuthSessionRecord]:
    raw_token = secrets.token_urlsafe(32)
    now = _utc_now()
    workspace = ensure_default_workspace(db, user)
    session = AuthSessionRecord(
        auth_session_id=_generate_id("ats"),
        user_id=user.user_id,
        active_workspace_id=workspace.workspace_id,
        token_hash=_hash_token(raw_token),
        expires_at=now + timedelta(days=AUTH_SESSION_DAYS),
        last_seen_at=now,
    )
    db.add(session)
    return raw_token, session


def revoke_auth_session(request: Request, db) -> bool:
    token = _get_bearer_token(request)
    if not token:
        return False

    session = db.scalar(
        select(AuthSessionRecord).where(AuthSessionRecord.token_hash == _hash_token(token))
    )
    if not session:
        return False

    db.delete(session)
    return True


def ensure_session_owner(db, session_id: str, user_id: str):
    existing = db.get(SessionPermissionRecord, (session_id, user_id, "owner"))
    if existing:
        return existing

    permission = SessionPermissionRecord(
        session_id=session_id,
        user_id=user_id,
        permission="owner",
    )
    db.add(permission)
    return permission


def verify_google_token(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception as exc:  # pragma: no cover - depends on upstream verification errors
        raise HTTPException(status_code=401, detail="Invalid Google credential") from exc

    email = normalize_email(claims.get("email", ""))
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Verified Google email is required")

    return {
        "provider_user_id": str(claims.get("sub")),
        "email": email,
        "display_name": claims.get("name") or email.split("@", 1)[0],
    }


def _create_user(db, *, email: str, display_name: str) -> UserRecord:
    user = UserRecord(
        user_id=_generate_id("usr"),
        primary_email=email,
        normalized_email=normalize_email(email),
        display_name=display_name.strip() or email.split("@", 1)[0],
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_google_user(db, google_profile: dict) -> UserRecord:
    identity = db.scalar(
        select(AuthIdentityRecord).where(
            AuthIdentityRecord.provider == "google",
            AuthIdentityRecord.provider_user_id == google_profile["provider_user_id"],
        )
    )
    if identity:
        user = db.get(UserRecord, identity.user_id)
        if user:
            user.display_name = google_profile["display_name"]
            db.add(user)
            return user

    user = db.scalar(
        select(UserRecord).where(UserRecord.normalized_email == google_profile["email"])
    )
    if not user:
        user = _create_user(
            db,
            email=google_profile["email"],
            display_name=google_profile["display_name"],
        )

    if not identity:
        db.add(
            AuthIdentityRecord(
                identity_id=_generate_id("aid"),
                user_id=user.user_id,
                provider="google",
                provider_user_id=google_profile["provider_user_id"],
                email=google_profile["email"],
                normalized_email=google_profile["email"],
                password_hash=None,
            )
        )
    user.display_name = google_profile["display_name"]
    db.add(user)
    return user


def create_password_user(db, *, email: str, password: str, display_name: str) -> UserRecord:
    normalized_email = normalize_email(email)
    if db.scalar(select(UserRecord).where(UserRecord.normalized_email == normalized_email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = _create_user(db, email=normalized_email, display_name=display_name)
    db.add(
        AuthIdentityRecord(
            identity_id=_generate_id("aid"),
            user_id=user.user_id,
            provider="password",
            provider_user_id=normalized_email,
            email=normalized_email,
            normalized_email=normalized_email,
            password_hash=hash_password(password),
        )
    )
    return user


def authenticate_password_user(db, *, email: str, password: str) -> UserRecord:
    normalized_email = normalize_email(email)
    identity = db.scalar(
        select(AuthIdentityRecord).where(
            AuthIdentityRecord.provider == "password",
            AuthIdentityRecord.normalized_email == normalized_email,
        )
    )
    if not identity or not identity.password_hash or not verify_password(password, identity.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = db.get(UserRecord, identity.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user
