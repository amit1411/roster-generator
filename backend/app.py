"""FastAPI backend for badminton roster generation."""

from __future__ import annotations

import os
import secrets
import time
from copy import deepcopy

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.exc import OperationalError

from database import (
    SessionRoundRecord,
    SessionScoreRecord,
    SharedSessionRecord,
    get_db_session,
    init_db,
)
from roster_engine import generate_roster, validate_roster, RosterError

app = FastAPI(title="Badminton Roster API")

ADMIN_RECOVERY_TOKEN = os.getenv("ADMIN_RECOVERY_TOKEN", "thisismytoken")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


class RosterRequest(BaseModel):
    players: list[str]
    fixed_pairs: list[list[str]] = []
    num_courts: int
    court_numbers: list[str] | None = None
    rounds: int = 9
    limits: dict[str, int] = {}
    pair_games: int = 3
    pair_start_round: int = 5
    max_consecutive_rest: int = 1
    seed: int | None = None

    @field_validator("players")
    @classmethod
    def players_not_empty(cls, v):
        if len(v) < 4:
            raise ValueError("Need at least 4 players")
        return v

    @field_validator("num_courts")
    @classmethod
    def courts_positive(cls, v):
        if v < 1:
            raise ValueError("Need at least 1 court")
        return v


class CourtResult(BaseModel):
    team_a: list[str]
    team_b: list[str]


class RoundResult(BaseModel):
    round: int
    courts: list[CourtResult]
    resting: list[str]


class RosterResponse(BaseModel):
    rounds: list[RoundResult]
    court_numbers: list[str]
    rest_counts: dict[str, int]
    fixed_pair_counts: dict[str, int]
    violations: list[str]
    warnings: list[str]


class DrawConfig(BaseModel):
    draw_type: str = "round_robin"
    league_meetings: int = 1
    knockout_qualifiers: int = 4


class SharedSessionCreateRequest(BaseModel):
    roster: RosterResponse
    draw_config: DrawConfig
    name: str | None = None


class SharedSessionResponse(BaseModel):
    session_id: str
    name: str
    created_at: str
    updated_at: str
    can_edit: bool
    edit_token: str | None = None
    roster: RosterResponse
    draw_config: DrawConfig
    league_scores_by_round: list[list[dict[str, int | str]]]
    active_league_round: int
    ended_league_rounds: list[bool]
    knockout_scores_by_round: list[list[dict[str, int | str]]]
    active_knockout_round: int
    ended_knockout_rounds: list[bool]
    can_undo: bool
    version: int


class SharedSessionSummary(BaseModel):
    session_id: str
    name: str
    created_at: str
    updated_at: str
    draw_type: str
    status: str
    ended_rounds: int
    total_rounds: int
    live_rounds: int


class RoundStartRequest(BaseModel):
    stage: str
    round_index: int


class ScoreUpdateRequest(BaseModel):
    stage: str
    round_index: int
    court_index: int
    team_key: str
    value: int | None = None


class BatchScoreUpdateRequest(BaseModel):
    stage: str
    round_index: int
    updates: list[ScoreUpdateRequest]


class RoundEndRequest(BaseModel):
    stage: str
    round_index: int


class RoundEditRequest(BaseModel):
    stage: str
    round_index: int


class SessionRenameRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Session name is required")
        if len(cleaned) > 120:
            raise ValueError("Session name must be 120 characters or fewer")
        return cleaned


class ScoreMutationResponse(BaseModel):
    ok: bool = True
    version: int


def _create_empty_scores(rounds: list[RoundResult]) -> list[list[dict[str, int | str]]]:
    return [
        [
            {"teamA": "", "teamB": ""}
            for _ in round.courts
        ]
        for round in rounds
    ]


def _ensure_score_slot(scores: list[list[dict[str, int | str]]], round_index: int, court_index: int):
    while len(scores) <= round_index:
        scores.append([])

    while len(scores[round_index]) <= court_index:
        scores[round_index].append({"teamA": "", "teamB": ""})


def _upgrade_session_payload(payload: dict) -> dict:
    payload.setdefault("edit_token", secrets.token_urlsafe(12))
    payload.setdefault("undo_stack", [])
    return payload


def _hydrate_legacy_session_storage(db, record: SharedSessionRecord, payload: dict):
    existing_round = db.scalar(
        select(SessionRoundRecord).where(SessionRoundRecord.session_id == record.session_id).limit(1)
    )
    existing_score = db.scalar(
        select(SessionScoreRecord).where(SessionScoreRecord.session_id == record.session_id).limit(1)
    )
    if existing_round or existing_score:
        return payload

    league_rounds = payload.get("roster", {}).get("rounds", [])
    legacy_league_scores = payload.get("league_scores_by_round", [])
    legacy_knockout_scores = payload.get("knockout_scores_by_round", [])
    legacy_ended_league = payload.get("ended_league_rounds", [False for _ in league_rounds])
    legacy_ended_knockout = payload.get("ended_knockout_rounds", [])
    legacy_active_league = payload.get("active_league_round", -1)
    legacy_active_knockout = payload.get("active_knockout_round", -1)

    for round_index in range(len(league_rounds)):
        db.add(
            SessionRoundRecord(
                session_id=record.session_id,
                stage="league",
                round_index=round_index,
                started=round_index <= legacy_active_league,
                ended=legacy_ended_league[round_index] if round_index < len(legacy_ended_league) else False,
            )
        )

    knockout_round_total = max(len(legacy_knockout_scores), len(legacy_ended_knockout), legacy_active_knockout + 1)
    for round_index in range(knockout_round_total):
        db.add(
            SessionRoundRecord(
                session_id=record.session_id,
                stage="knockout",
                round_index=round_index,
                started=round_index <= legacy_active_knockout,
                ended=legacy_ended_knockout[round_index] if round_index < len(legacy_ended_knockout) else False,
            )
        )

    for stage, rounds in (("league", legacy_league_scores), ("knockout", legacy_knockout_scores)):
        for round_index, round_scores in enumerate(rounds):
            for court_index, score in enumerate(round_scores):
                team_a_score = None if score.get("teamA", "") == "" else score.get("teamA")
                team_b_score = None if score.get("teamB", "") == "" else score.get("teamB")
                if team_a_score is None and team_b_score is None:
                    continue
                db.add(
                    SessionScoreRecord(
                        session_id=record.session_id,
                        stage=stage,
                        round_index=round_index,
                        court_index=court_index,
                        team_a_score=team_a_score,
                        team_b_score=team_b_score,
                    )
                )

    next_payload = deepcopy(payload)
    for key in (
        "league_scores_by_round",
        "active_league_round",
        "ended_league_rounds",
        "knockout_scores_by_round",
        "active_knockout_round",
        "ended_knockout_rounds",
    ):
        next_payload.pop(key, None)

    record.data = next_payload
    db.add(record)
    db.flush()
    return next_payload


def _get_round_state(db, session_id: str, stage: str, total_rounds: int):
    round_records = db.scalars(
        select(SessionRoundRecord)
        .where(SessionRoundRecord.session_id == session_id, SessionRoundRecord.stage == stage)
        .order_by(SessionRoundRecord.round_index.asc())
    ).all()
    round_map = {record.round_index: record for record in round_records}
    ended_rounds = [bool(round_map.get(round_index) and round_map[round_index].ended) for round_index in range(total_rounds)]
    active_round = max((record.round_index for record in round_records if record.started), default=-1)
    return active_round, ended_rounds


def _get_scores_by_round(db, session_id: str, stage: str, round_sizes: list[int]):
    scores_by_round = [
        [{"teamA": "", "teamB": ""} for _ in range(court_count)]
        for court_count in round_sizes
    ]
    score_records = db.scalars(
        select(SessionScoreRecord)
        .where(SessionScoreRecord.session_id == session_id, SessionScoreRecord.stage == stage)
        .order_by(SessionScoreRecord.round_index.asc(), SessionScoreRecord.court_index.asc())
    ).all()
    for record in score_records:
        while len(scores_by_round) <= record.round_index:
            scores_by_round.append([])
        while len(scores_by_round[record.round_index]) <= record.court_index:
            scores_by_round[record.round_index].append({"teamA": "", "teamB": ""})
        scores_by_round[record.round_index][record.court_index] = {
            "teamA": "" if record.team_a_score is None else record.team_a_score,
            "teamB": "" if record.team_b_score is None else record.team_b_score,
        }
    return scores_by_round


def _serialize_session(record: SharedSessionRecord, edit_token: str | None = None, db=None) -> SharedSessionResponse:
    should_close_db = db is None
    db_session = db
    if should_close_db:
        db_context = get_db_session()
        db_session = db_context.__enter__()

    try:
        payload = _upgrade_session_payload(deepcopy(record.data))
        payload = _hydrate_legacy_session_storage(db_session, record, payload)
        roster_rounds = payload.get("roster", {}).get("rounds", [])
        league_round_sizes = [len(round_data.get("courts", [])) for round_data in roster_rounds]
        active_league_round, ended_league_rounds = _get_round_state(
            db_session, record.session_id, "league", len(roster_rounds)
        )
        active_knockout_round, ended_knockout_rounds = _get_round_state(
            db_session, record.session_id, "knockout", 0
        )
        knockout_round_total = max(
            len(ended_knockout_rounds),
            active_knockout_round + 1,
        )
        if knockout_round_total > len(ended_knockout_rounds):
            ended_knockout_rounds.extend([False] * (knockout_round_total - len(ended_knockout_rounds)))
        league_scores_by_round = _get_scores_by_round(
            db_session, record.session_id, "league", league_round_sizes
        )
        knockout_scores_by_round = _get_scores_by_round(
            db_session, record.session_id, "knockout", [0 for _ in range(knockout_round_total)]
        )

        can_undo = len(payload.get("undo_stack", [])) > 0
        response_payload = {
            key: value for key, value in payload.items() if key not in {"undo_stack", "edit_token"}
        }
        can_edit = _is_valid_edit_token(payload, edit_token)
        return SharedSessionResponse(
            session_id=record.session_id,
            created_at=record.created_at.isoformat(),
            updated_at=record.updated_at.isoformat(),
            can_edit=can_edit,
            edit_token=edit_token if can_edit else None,
            can_undo=can_undo,
            version=record.version,
            league_scores_by_round=league_scores_by_round,
            active_league_round=active_league_round,
            ended_league_rounds=ended_league_rounds,
            knockout_scores_by_round=knockout_scores_by_round,
            active_knockout_round=active_knockout_round,
            ended_knockout_rounds=ended_knockout_rounds,
            **response_payload,
        )
    finally:
        if should_close_db:
            db_context.__exit__(None, None, None)


def _count_league_pairs(payload: dict) -> int:
    pairs = set()
    for round_data in payload.get("roster", {}).get("rounds", []):
        for court in round_data.get("courts", []):
            pairs.add(" & ".join(court.get("team_a", [])))
            pairs.add(" & ".join(court.get("team_b", [])))
    return len([pair for pair in pairs if pair])


def _planned_knockout_rounds(draw_config: dict, pair_count: int) -> int:
    if draw_config.get("draw_type") != "league_knockout":
        return 0
    qualifiers = min(draw_config.get("knockout_qualifiers", 4), pair_count)
    if qualifiers >= 4:
        return 2
    if qualifiers >= 2:
        return 1
    return 0


def _serialize_session_summary(record: SharedSessionRecord, db=None) -> SharedSessionSummary:
    should_close_db = db is None
    db_session = db
    if should_close_db:
        db_context = get_db_session()
        db_session = db_context.__enter__()

    try:
        payload = _upgrade_session_payload(deepcopy(record.data))
        payload = _hydrate_legacy_session_storage(db_session, record, payload)
        draw_config = payload.get("draw_config", {})
        league_total = len(payload.get("roster", {}).get("rounds", []))
        knockout_total = _planned_knockout_rounds(draw_config, _count_league_pairs(payload))
        total_rounds = league_total + knockout_total
        active_league_round, ended_league_rounds = _get_round_state(db_session, record.session_id, "league", league_total)
        active_knockout_round, ended_knockout_rounds = _get_round_state(db_session, record.session_id, "knockout", knockout_total)
        ended_rounds = sum(1 for ended in ended_league_rounds if ended) + sum(1 for ended in ended_knockout_rounds if ended)
        live_rounds = max(0, active_league_round + 1 - sum(ended_league_rounds))
        live_rounds += max(0, active_knockout_round + 1 - sum(ended_knockout_rounds))

        if ended_rounds >= total_rounds and total_rounds > 0:
            status = "completed"
        elif active_league_round >= 0 or active_knockout_round >= 0:
            status = "in_progress"
        else:
            status = "ready"

        return SharedSessionSummary(
            session_id=record.session_id,
            name=record.name,
            created_at=record.created_at.isoformat(),
            updated_at=record.updated_at.isoformat(),
            draw_type=draw_config.get("draw_type", "round_robin"),
            status=status,
            ended_rounds=ended_rounds,
            total_rounds=total_rounds,
            live_rounds=live_rounds,
        )
    finally:
        if should_close_db:
            db_context.__exit__(None, None, None)


def _generate_session_id() -> str:
    return secrets.token_urlsafe(6)


def _get_session_record(session_id: str) -> SharedSessionRecord:
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")
        _hydrate_legacy_session_storage(db, record, _upgrade_session_payload(deepcopy(record.data)))
        db.expunge(record)
        return record


def _is_valid_edit_token(payload: dict, edit_token: str | None) -> bool:
    if edit_token is None:
        return False

    return edit_token == payload.get("edit_token") or edit_token == ADMIN_RECOVERY_TOKEN


def _require_edit_access(payload: dict, edit_token: str | None):
    if not _is_valid_edit_token(payload, edit_token):
        raise HTTPException(status_code=403, detail="Scorer access required")


def _get_or_create_round_record(db, session_id: str, stage: str, round_index: int) -> SessionRoundRecord:
    record = db.get(SessionRoundRecord, (session_id, stage, round_index))
    if record:
        return record

    record = SessionRoundRecord(
        session_id=session_id,
        stage=stage,
        round_index=round_index,
        started=False,
        ended=False,
    )
    db.add(record)
    db.flush()
    return record


def _get_stage_progress(db, session_id: str, stage: str):
    round_records = db.scalars(
        select(SessionRoundRecord)
        .where(SessionRoundRecord.session_id == session_id, SessionRoundRecord.stage == stage)
        .order_by(SessionRoundRecord.round_index.asc())
    ).all()
    active_round = max((record.round_index for record in round_records if record.started), default=-1)
    return round_records, active_round


def _get_score_record(db, session_id: str, stage: str, round_index: int, court_index: int) -> SessionScoreRecord | None:
    return db.get(SessionScoreRecord, (session_id, stage, round_index, court_index))


def _validate_score_target(db, session_id: str, payload: dict, stage: str, round_index: int, court_index: int):
    if stage not in {"league", "knockout"}:
        raise HTTPException(status_code=400, detail="Invalid stage")

    if stage == "league":
        rounds = payload.get("roster", {}).get("rounds", [])
        if round_index < 0 or round_index >= len(rounds):
            raise HTTPException(status_code=400, detail="Invalid round or court index")
        court_count = len(rounds[round_index].get("courts", []))
        if court_index < 0 or court_index >= court_count:
            raise HTTPException(status_code=400, detail="Invalid round or court index")

    round_record = db.get(SessionRoundRecord, (session_id, stage, round_index))
    if round_record and round_record.ended:
        raise HTTPException(status_code=409, detail="Round is locked after being ended")


def _apply_score_update(db, session_id: str, payload: dict, req: ScoreUpdateRequest):
    if req.team_key not in {"teamA", "teamB"}:
        raise HTTPException(status_code=400, detail="Invalid team key")

    _validate_score_target(db, session_id, payload, req.stage, req.round_index, req.court_index)

    next_value = "" if req.value is None else req.value
    score_record = _get_score_record(db, session_id, req.stage, req.round_index, req.court_index)
    current_value = ""
    if score_record:
        current_value = score_record.team_a_score if req.team_key == "teamA" else score_record.team_b_score
        current_value = "" if current_value is None else current_value

    if current_value == next_value:
        return False

    if not score_record:
        score_record = SessionScoreRecord(
            session_id=session_id,
            stage=req.stage,
            round_index=req.round_index,
            court_index=req.court_index,
            team_a_score=None,
            team_b_score=None,
        )

    if req.team_key == "teamA":
        score_record.team_a_score = None if next_value == "" else int(next_value)
    else:
        score_record.team_b_score = None if next_value == "" else int(next_value)
    db.add(score_record)
    return True


def _update_session_record(session_id: str, updater, edit_token: str | None = None, response_builder=None):
    for attempt in range(3):
        try:
            with get_db_session() as db:
                record = db.scalar(
                    select(SharedSessionRecord)
                    .where(SharedSessionRecord.session_id == session_id)
                    .with_for_update()
                )
                if not record:
                    raise HTTPException(status_code=404, detail="Shared session not found")

                next_payload = _upgrade_session_payload(deepcopy(record.data))
                next_payload = _hydrate_legacy_session_storage(db, record, next_payload)
                _require_edit_access(next_payload, edit_token)
                changed = updater(db, record, next_payload)
                if changed is False:
                    return (
                        response_builder(record, db)
                        if response_builder
                        else _serialize_session(record, edit_token=edit_token, db=db)
                    )

                record.data = next_payload
                record.version += 1
                db.add(record)
                db.flush()
                db.refresh(record)
                return (
                    response_builder(record, db)
                    if response_builder
                    else _serialize_session(record, edit_token=edit_token, db=db)
                )
        except OperationalError as exc:
            message = str(exc).lower()
            if "statement timeout" not in message or attempt == 2:
                raise
            time.sleep(0.2 * (attempt + 1))


def _capture_undo_snapshot(payload: dict):
    payload["undo_stack"] = []


def _restore_undo_snapshot(payload: dict, snapshot: dict):
    payload["undo_stack"] = []


@app.post("/api/generate", response_model=RosterResponse)
def api_generate(req: RosterRequest):
    fixed_pairs = [tuple(sorted(p)) for p in req.fixed_pairs]

    court_numbers = req.court_numbers
    if not court_numbers or len(court_numbers) != req.num_courts:
        court_numbers = [str(i + 1) for i in range(req.num_courts)]

    try:
        rounds, rest_counts, fpc, warnings = generate_roster(
            players=req.players,
            num_courts=req.num_courts,
            num_rounds=req.rounds,
            consecutive_limits=req.limits,
            fixed_pairs=fixed_pairs,
            pair_target=req.pair_games,
            max_consecutive_rest=req.max_consecutive_rest,
            pair_start_round=req.pair_start_round,
            seed=req.seed,
        )
    except RosterError as e:
        raise HTTPException(status_code=422, detail=str(e))

    violations = validate_roster(
        rounds, req.limits, req.max_consecutive_rest,
        fixed_pairs, fpc, req.pair_games, req.pair_start_round,
    )

    round_results = []
    for r in rounds:
        courts = [
            CourtResult(team_a=list(ta), team_b=list(tb))
            for ta, tb in r["courts"]
        ]
        round_results.append(RoundResult(
            round=r["round"], courts=courts, resting=r["resting"],
        ))

    fpc_str = {f"{a} & {b}": count for (a, b), count in fpc.items()}

    return RosterResponse(
        rounds=round_results,
        court_numbers=court_numbers,
        rest_counts=rest_counts,
        fixed_pair_counts=fpc_str,
        violations=violations,
        warnings=warnings,
    )


@app.post("/api/sessions", response_model=SharedSessionResponse)
def create_shared_session(req: SharedSessionCreateRequest):
    payload = {
        "name": req.name or f"session-{secrets.token_hex(2)}",
        "edit_token": secrets.token_urlsafe(12),
        "roster": req.roster.model_dump(),
        "draw_config": req.draw_config.model_dump(),
    }

    with get_db_session() as db:
        while True:
            session_id = _generate_session_id()
            existing = db.scalar(
                select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
            )
            if not existing:
                break

        record = SharedSessionRecord(
            session_id=session_id,
            name=payload["name"],
            data=payload,
            version=1,
        )
        db.add(record)
        db.flush()
        db.refresh(record)
        return _serialize_session(record, edit_token=payload["edit_token"], db=db)


@app.get("/api/sessions/{session_id}", response_model=SharedSessionResponse)
def get_shared_session(session_id: str, edit_token: str | None = None):
    record = _get_session_record(session_id)
    return _serialize_session(record, edit_token=edit_token)


@app.get("/api/sessions", response_model=list[SharedSessionSummary])
def list_shared_sessions():
    with get_db_session() as db:
        records = db.scalars(
            select(SharedSessionRecord).order_by(SharedSessionRecord.updated_at.desc())
        ).all()
        return [_serialize_session_summary(record, db=db) for record in records]


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_shared_session(session_id: str, edit_token: str | None = None):
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")
        payload = _hydrate_legacy_session_storage(db, record, _upgrade_session_payload(deepcopy(record.data)))
        _require_edit_access(payload, edit_token)
        round_records = db.scalars(
            select(SessionRoundRecord).where(SessionRoundRecord.session_id == session_id)
        ).all()
        for round_record in round_records:
            db.delete(round_record)
        score_records = db.scalars(
            select(SessionScoreRecord).where(SessionScoreRecord.session_id == session_id)
        ).all()
        for score_record in score_records:
            db.delete(score_record)
        db.delete(record)
    return Response(status_code=204)


@app.post("/api/sessions/{session_id}/rename", response_model=SharedSessionResponse)
def rename_shared_session(session_id: str, req: SessionRenameRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        next_name = req.name.strip()
        if record.name == next_name and payload.get("name") == next_name:
            return False

        payload["name"] = next_name
        record.name = next_name
        db.add(record)
        return True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/start-round", response_model=SharedSessionResponse)
def start_round(session_id: str, req: RoundStartRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        if req.stage == "league":
            current_round = _get_stage_progress(db, session_id, "league")[1]
            if req.round_index != current_round + 1:
                raise HTTPException(status_code=409, detail="Round must be started in sequence")
            if req.round_index >= len(payload.get("roster", {}).get("rounds", [])):
                raise HTTPException(status_code=400, detail="Invalid round index")
            _capture_undo_snapshot(payload)
            round_record = _get_or_create_round_record(db, session_id, "league", req.round_index)
            round_record.started = True
            db.add(round_record)
            return True

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        current_round = _get_stage_progress(db, session_id, "knockout")[1]
        if req.round_index != current_round + 1:
            raise HTTPException(status_code=409, detail="Round must be started in sequence")
        _capture_undo_snapshot(payload)
        round_record = _get_or_create_round_record(db, session_id, "knockout", req.round_index)
        round_record.started = True
        db.add(round_record)
        return True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/end-round", response_model=SharedSessionResponse)
def end_round(session_id: str, req: RoundEndRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        if req.stage == "league":
            round_records, active_round = _get_stage_progress(db, session_id, "league")
            round_record = next((item for item in round_records if item.round_index == req.round_index), None)
            if req.round_index < 0 or req.round_index > active_round or not round_record or not round_record.started:
                raise HTTPException(status_code=409, detail="Round must be started before it can be ended")
            if round_record.ended:
                raise HTTPException(status_code=409, detail="Round has already been ended")

            league_rounds = payload.get("roster", {}).get("rounds", [])
            round_sizes = [len(round_data.get("courts", [])) for round_data in league_rounds]
            round_scores = _get_scores_by_round(db, session_id, "league", round_sizes)[req.round_index]
            if not all(score["teamA"] != "" and score["teamB"] != "" for score in round_scores):
                raise HTTPException(status_code=409, detail="Enter all scores before ending the round")

            _capture_undo_snapshot(payload)
            round_record.ended = True
            db.add(round_record)
            return True

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        round_records, active_round = _get_stage_progress(db, session_id, "knockout")
        round_record = next((item for item in round_records if item.round_index == req.round_index), None)
        if req.round_index < 0 or req.round_index > active_round or not round_record or not round_record.started:
            raise HTTPException(status_code=409, detail="Round must be started before it can be ended")
        if round_record.ended:
            raise HTTPException(status_code=409, detail="Round has already been ended")

        round_scores = _get_scores_by_round(db, session_id, "knockout", [0 for _ in range(req.round_index + 1)])[req.round_index]
        if not round_scores or not all(score["teamA"] != "" and score["teamB"] != "" for score in round_scores):
            raise HTTPException(status_code=409, detail="Enter all scores before ending the round")

        _capture_undo_snapshot(payload)
        round_record.ended = True
        db.add(round_record)
        return True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/undo", response_model=SharedSessionResponse)
def undo_last_change(session_id: str, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        if not payload["undo_stack"]:
            raise HTTPException(status_code=409, detail="Nothing to undo")

        snapshot = payload["undo_stack"].pop()
        _restore_undo_snapshot(payload, snapshot)
        return True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/edit-round", response_model=SharedSessionResponse)
def edit_round(session_id: str, req: RoundEditRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        if req.stage == "league":
            if req.round_index < 0 or req.round_index >= len(payload.get("roster", {}).get("rounds", [])):
                raise HTTPException(status_code=400, detail="Invalid round index")
            round_record = db.get(SessionRoundRecord, (session_id, "league", req.round_index))
            if not round_record or not round_record.ended:
                raise HTTPException(status_code=409, detail="Only ended rounds can be edited")

            _capture_undo_snapshot(payload)
            round_record.ended = False
            db.add(round_record)
            knockout_rounds = db.scalars(
                select(SessionRoundRecord).where(
                    SessionRoundRecord.session_id == session_id,
                    SessionRoundRecord.stage == "knockout",
                )
            ).all()
            for knockout_round in knockout_rounds:
                db.delete(knockout_round)
            knockout_scores = db.scalars(
                select(SessionScoreRecord).where(
                    SessionScoreRecord.session_id == session_id,
                    SessionScoreRecord.stage == "knockout",
                )
            ).all()
            for knockout_score in knockout_scores:
                db.delete(knockout_score)
            return True

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        round_record = db.get(SessionRoundRecord, (session_id, "knockout", req.round_index))
        if not round_record:
            raise HTTPException(status_code=400, detail="Invalid round index")
        if not round_record.ended:
            raise HTTPException(status_code=409, detail="Only ended rounds can be edited")

        _capture_undo_snapshot(payload)
        later_rounds = db.scalars(
            select(SessionRoundRecord).where(
                SessionRoundRecord.session_id == session_id,
                SessionRoundRecord.stage == "knockout",
                SessionRoundRecord.round_index > req.round_index,
            )
        ).all()
        for later_round in later_rounds:
            db.delete(later_round)
        later_scores = db.scalars(
            select(SessionScoreRecord).where(
                SessionScoreRecord.session_id == session_id,
                SessionScoreRecord.stage == "knockout",
                SessionScoreRecord.round_index > req.round_index,
            )
        ).all()
        for later_score in later_scores:
            db.delete(later_score)
        round_record.ended = False
        round_record.started = True
        db.add(round_record)
        return True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/score", response_model=ScoreMutationResponse)
def update_score(session_id: str, req: ScoreUpdateRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        return _apply_score_update(db, session_id, payload, req)

    return _update_session_record(
        session_id,
        updater,
        edit_token=edit_token,
        response_builder=lambda record, db: ScoreMutationResponse(version=record.version),
    )


@app.post("/api/sessions/{session_id}/scores/batch", response_model=ScoreMutationResponse)
def update_scores_batch(session_id: str, req: BatchScoreUpdateRequest, edit_token: str | None = None):
    def updater(db, record, payload: dict):
        changed = False
        for update in req.updates:
            if update.stage != req.stage or update.round_index != req.round_index:
                raise HTTPException(status_code=400, detail="Batch updates must target the same stage and round")
            if _apply_score_update(db, session_id, payload, update):
                changed = True
        return changed

    return _update_session_record(
        session_id,
        updater,
        edit_token=edit_token,
        response_builder=lambda record, db: ScoreMutationResponse(version=record.version),
    )
