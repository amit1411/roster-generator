"""FastAPI backend for badminton roster generation."""

from __future__ import annotations

import secrets
from copy import deepcopy

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from database import SharedSessionRecord, get_db_session, init_db
from roster_engine import generate_roster, validate_roster, RosterError

app = FastAPI(title="Badminton Roster API")

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
    roster: RosterResponse
    draw_config: DrawConfig
    league_scores_by_round: list[list[dict[str, int | str]]]
    active_league_round: int
    ended_league_rounds: list[bool]
    knockout_scores_by_round: list[list[dict[str, int | str]]]
    active_knockout_round: int
    ended_knockout_rounds: list[bool]
    version: int


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
    league_round_count = len(payload.get("roster", {}).get("rounds", []))
    payload.setdefault("league_scores_by_round", [[] for _ in range(league_round_count)])
    payload.setdefault("active_league_round", -1)
    payload.setdefault("ended_league_rounds", [False for _ in range(league_round_count)])
    if len(payload["ended_league_rounds"]) < league_round_count:
        payload["ended_league_rounds"].extend([False] * (league_round_count - len(payload["ended_league_rounds"])))

    payload.setdefault("knockout_scores_by_round", [])
    payload.setdefault("active_knockout_round", -1)
    payload.setdefault("ended_knockout_rounds", [])
    return payload


def _serialize_session(record: SharedSessionRecord) -> SharedSessionResponse:
    payload = _upgrade_session_payload(deepcopy(record.data))
    return SharedSessionResponse(
        session_id=record.session_id,
        version=record.version,
        **payload,
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


def _update_session_record(session_id: str, updater) -> SharedSessionResponse:
    with get_db_session() as db:
        record = db.scalar(
            select(SharedSessionRecord).where(SharedSessionRecord.session_id == session_id)
        )
        if not record:
            raise HTTPException(status_code=404, detail="Shared session not found")

        next_payload = _upgrade_session_payload(deepcopy(record.data))
        updater(next_payload)
        record.data = next_payload
        record.version += 1
        db.add(record)
        db.flush()
        db.refresh(record)
        db.expunge(record)
        return _serialize_session(record)


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
        return _serialize_session(record)


@app.get("/api/sessions/{session_id}", response_model=SharedSessionResponse)
def get_shared_session(session_id: str):
    record = _get_session_record(session_id)
    return _serialize_session(record)


@app.post("/api/sessions/{session_id}/start-round", response_model=SharedSessionResponse)
def start_round(session_id: str, req: RoundStartRequest):
    def updater(payload: dict):
        if req.stage == "league":
            current_round = payload["active_league_round"]
            if req.round_index != current_round + 1:
                raise HTTPException(status_code=409, detail="Round must be started in sequence")
            if req.round_index >= len(payload["league_scores_by_round"]):
                raise HTTPException(status_code=400, detail="Invalid round index")
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
        payload["active_knockout_round"] = req.round_index

    return _update_session_record(session_id, updater)


@app.post("/api/sessions/{session_id}/end-round", response_model=SharedSessionResponse)
def end_round(session_id: str, req: RoundEndRequest):
    def updater(payload: dict):
        if req.stage == "league":
            if req.round_index < 0 or req.round_index > payload["active_league_round"]:
                raise HTTPException(status_code=409, detail="Round must be started before it can be ended")
            if payload["ended_league_rounds"][req.round_index]:
                raise HTTPException(status_code=409, detail="Round has already been ended")

            round_scores = payload["league_scores_by_round"][req.round_index]
            if not all(score["teamA"] != "" and score["teamB"] != "" for score in round_scores):
                raise HTTPException(status_code=409, detail="Enter all scores before ending the round")

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

        payload["ended_knockout_rounds"][req.round_index] = True

    return _update_session_record(session_id, updater)


@app.post("/api/sessions/{session_id}/score", response_model=SharedSessionResponse)
def update_score(session_id: str, req: ScoreUpdateRequest):
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

        court_score[req.team_key] = "" if req.value is None else req.value

    return _update_session_record(session_id, updater)
