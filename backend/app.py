"""FastAPI backend for badminton roster generation."""

from __future__ import annotations

import os
import secrets
from copy import deepcopy

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from database import SharedSessionRecord, get_db_session, init_db
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


class RoundEndRequest(BaseModel):
    stage: str
    round_index: int


class RoundEditRequest(BaseModel):
    stage: str
    round_index: int


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
    league_round_count = len(payload.get("roster", {}).get("rounds", []))
    payload.setdefault("league_scores_by_round", [[] for _ in range(league_round_count)])
    payload.setdefault("active_league_round", -1)
    payload.setdefault("ended_league_rounds", [False for _ in range(league_round_count)])
    if len(payload["ended_league_rounds"]) < league_round_count:
        payload["ended_league_rounds"].extend([False] * (league_round_count - len(payload["ended_league_rounds"])))

    payload.setdefault("knockout_scores_by_round", [])
    payload.setdefault("active_knockout_round", -1)
    payload.setdefault("ended_knockout_rounds", [])
    payload.setdefault("undo_stack", [])
    return payload


def _serialize_session(record: SharedSessionRecord, edit_token: str | None = None) -> SharedSessionResponse:
    payload = _upgrade_session_payload(deepcopy(record.data))
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
        **response_payload,
    )


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


def _serialize_session_summary(record: SharedSessionRecord) -> SharedSessionSummary:
    payload = _upgrade_session_payload(deepcopy(record.data))
    draw_config = payload.get("draw_config", {})
    league_total = len(payload.get("roster", {}).get("rounds", []))
    knockout_total = _planned_knockout_rounds(draw_config, _count_league_pairs(payload))
    total_rounds = league_total + knockout_total
    ended_rounds = sum(1 for ended in payload.get("ended_league_rounds", []) if ended) + sum(
        1 for ended in payload.get("ended_knockout_rounds", []) if ended
    )
    live_rounds = max(0, payload.get("active_league_round", -1) + 1 - sum(payload.get("ended_league_rounds", [])))
    live_rounds += max(0, payload.get("active_knockout_round", -1) + 1 - sum(payload.get("ended_knockout_rounds", [])))

    if ended_rounds >= total_rounds and total_rounds > 0:
        status = "completed"
    elif payload.get("active_league_round", -1) >= 0 or payload.get("active_knockout_round", -1) >= 0:
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


def _generate_session_id() -> str:
    return secrets.token_urlsafe(6)


def _get_session_record(session_id: str) -> SharedSessionRecord:
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")
        db.expunge(record)
        return record


def _is_valid_edit_token(payload: dict, edit_token: str | None) -> bool:
    if edit_token is None:
        return False

    return edit_token == payload.get("edit_token") or edit_token == ADMIN_RECOVERY_TOKEN


def _require_edit_access(payload: dict, edit_token: str | None):
    if not _is_valid_edit_token(payload, edit_token):
        raise HTTPException(status_code=403, detail="Scorer access required")


def _update_session_record(session_id: str, updater, edit_token: str | None = None) -> SharedSessionResponse:
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")

        next_payload = _upgrade_session_payload(deepcopy(record.data))
        _require_edit_access(next_payload, edit_token)
        updater(next_payload)
        record.data = next_payload
        record.version += 1
        db.add(record)
        db.flush()
        db.refresh(record)
        db.expunge(record)
        return _serialize_session(record, edit_token=edit_token)


def _capture_undo_snapshot(payload: dict):
    snapshot = {
        "league_scores_by_round": deepcopy(payload["league_scores_by_round"]),
        "active_league_round": payload["active_league_round"],
        "ended_league_rounds": deepcopy(payload["ended_league_rounds"]),
        "knockout_scores_by_round": deepcopy(payload["knockout_scores_by_round"]),
        "active_knockout_round": payload["active_knockout_round"],
        "ended_knockout_rounds": deepcopy(payload["ended_knockout_rounds"]),
    }
    payload["undo_stack"].append(snapshot)
    payload["undo_stack"] = payload["undo_stack"][-30:]


def _restore_undo_snapshot(payload: dict, snapshot: dict):
    payload["league_scores_by_round"] = deepcopy(snapshot["league_scores_by_round"])
    payload["active_league_round"] = snapshot["active_league_round"]
    payload["ended_league_rounds"] = deepcopy(snapshot["ended_league_rounds"])
    payload["knockout_scores_by_round"] = deepcopy(snapshot["knockout_scores_by_round"])
    payload["active_knockout_round"] = snapshot["active_knockout_round"]
    payload["ended_knockout_rounds"] = deepcopy(snapshot["ended_knockout_rounds"])


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
        "league_scores_by_round": _create_empty_scores(req.roster.rounds),
        "active_league_round": -1,
        "ended_league_rounds": [False for _ in req.roster.rounds],
        "knockout_scores_by_round": [],
        "active_knockout_round": -1,
        "ended_knockout_rounds": [],
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
        db.expunge(record)
        return _serialize_session(record, edit_token=payload["edit_token"])


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
        for record in records:
            db.expunge(record)
        return [_serialize_session_summary(record) for record in records]


@app.delete("/api/sessions/{session_id}", status_code=204)
def delete_shared_session(session_id: str, edit_token: str | None = None):
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")
        payload = _upgrade_session_payload(deepcopy(record.data))
        _require_edit_access(payload, edit_token)
        db.delete(record)
    return Response(status_code=204)


@app.post("/api/sessions/{session_id}/start-round", response_model=SharedSessionResponse)
def start_round(session_id: str, req: RoundStartRequest, edit_token: str | None = None):
    def updater(payload: dict):
        if req.stage == "league":
            current_round = payload["active_league_round"]
            if req.round_index != current_round + 1:
                raise HTTPException(status_code=409, detail="Round must be started in sequence")
            if req.round_index >= len(payload["league_scores_by_round"]):
                raise HTTPException(status_code=400, detail="Invalid round index")
            _capture_undo_snapshot(payload)
            payload["active_league_round"] = req.round_index
            return

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        current_round = payload["active_knockout_round"]
        if req.round_index != current_round + 1:
            raise HTTPException(status_code=409, detail="Round must be started in sequence")
        _ensure_score_slot(payload["knockout_scores_by_round"], req.round_index, 0)
        while len(payload["ended_knockout_rounds"]) <= req.round_index:
            payload["ended_knockout_rounds"].append(False)
        _capture_undo_snapshot(payload)
        payload["active_knockout_round"] = req.round_index

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/end-round", response_model=SharedSessionResponse)
def end_round(session_id: str, req: RoundEndRequest, edit_token: str | None = None):
    def updater(payload: dict):
        if req.stage == "league":
            if req.round_index < 0 or req.round_index > payload["active_league_round"]:
                raise HTTPException(status_code=409, detail="Round must be started before it can be ended")
            if payload["ended_league_rounds"][req.round_index]:
                raise HTTPException(status_code=409, detail="Round has already been ended")

            round_scores = payload["league_scores_by_round"][req.round_index]
            if not all(score["teamA"] != "" and score["teamB"] != "" for score in round_scores):
                raise HTTPException(status_code=409, detail="Enter all scores before ending the round")

            _capture_undo_snapshot(payload)
            payload["ended_league_rounds"][req.round_index] = True
            return

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        if req.round_index < 0 or req.round_index > payload["active_knockout_round"]:
            raise HTTPException(status_code=409, detail="Round must be started before it can be ended")

        _ensure_score_slot(payload["knockout_scores_by_round"], req.round_index, 0)
        while len(payload["ended_knockout_rounds"]) <= req.round_index:
            payload["ended_knockout_rounds"].append(False)
        if payload["ended_knockout_rounds"][req.round_index]:
            raise HTTPException(status_code=409, detail="Round has already been ended")

        round_scores = payload["knockout_scores_by_round"][req.round_index]
        if not all(score["teamA"] != "" and score["teamB"] != "" for score in round_scores):
            raise HTTPException(status_code=409, detail="Enter all scores before ending the round")

        _capture_undo_snapshot(payload)
        payload["ended_knockout_rounds"][req.round_index] = True

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/undo", response_model=SharedSessionResponse)
def undo_last_change(session_id: str, edit_token: str | None = None):
    def updater(payload: dict):
        if not payload["undo_stack"]:
            raise HTTPException(status_code=409, detail="Nothing to undo")

        snapshot = payload["undo_stack"].pop()
        _restore_undo_snapshot(payload, snapshot)

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/edit-round", response_model=SharedSessionResponse)
def edit_round(session_id: str, req: RoundEditRequest, edit_token: str | None = None):
    def updater(payload: dict):
        if req.stage == "league":
            if req.round_index < 0 or req.round_index >= len(payload["ended_league_rounds"]):
                raise HTTPException(status_code=400, detail="Invalid round index")
            if not payload["ended_league_rounds"][req.round_index]:
                raise HTTPException(status_code=409, detail="Only ended rounds can be edited")

            _capture_undo_snapshot(payload)
            payload["ended_league_rounds"][req.round_index] = False
            payload["knockout_scores_by_round"] = []
            payload["active_knockout_round"] = -1
            payload["ended_knockout_rounds"] = []
            return

        if req.stage != "knockout":
            raise HTTPException(status_code=400, detail="Invalid stage")

        if req.round_index < 0 or req.round_index >= len(payload["ended_knockout_rounds"]):
            raise HTTPException(status_code=400, detail="Invalid round index")
        if not payload["ended_knockout_rounds"][req.round_index]:
            raise HTTPException(status_code=409, detail="Only ended rounds can be edited")

        _capture_undo_snapshot(payload)
        payload["ended_knockout_rounds"] = payload["ended_knockout_rounds"][: req.round_index + 1]
        payload["knockout_scores_by_round"] = payload["knockout_scores_by_round"][: req.round_index + 1]
        payload["ended_knockout_rounds"][req.round_index] = False
        payload["active_knockout_round"] = req.round_index

    return _update_session_record(session_id, updater, edit_token=edit_token)


@app.post("/api/sessions/{session_id}/score", response_model=SharedSessionResponse)
def update_score(session_id: str, req: ScoreUpdateRequest, edit_token: str | None = None):
    if req.team_key not in {"teamA", "teamB"}:
        raise HTTPException(status_code=400, detail="Invalid team key")

    def updater(payload: dict):
        scores_key = "league_scores_by_round" if req.stage == "league" else "knockout_scores_by_round"
        ended_key = "ended_league_rounds" if req.stage == "league" else "ended_knockout_rounds"
        if req.stage not in {"league", "knockout"}:
            raise HTTPException(status_code=400, detail="Invalid stage")

        try:
            if req.stage == "knockout":
                _ensure_score_slot(payload[scores_key], req.round_index, req.court_index)
                while len(payload[ended_key]) <= req.round_index:
                    payload[ended_key].append(False)

            round_scores = payload[scores_key][req.round_index]
            court_score = round_scores[req.court_index]
        except (IndexError, KeyError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid round or court index")

        if payload[ended_key][req.round_index]:
            raise HTTPException(status_code=409, detail="Round is locked after being ended")

        next_value = "" if req.value is None else req.value
        if court_score[req.team_key] == next_value:
            return

        _capture_undo_snapshot(payload)
        court_score[req.team_key] = next_value

    return _update_session_record(session_id, updater, edit_token=edit_token)
