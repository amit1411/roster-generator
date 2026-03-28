"""FastAPI backend for badminton roster generation."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from roster_engine import generate_roster, validate_roster, RosterError

app = FastAPI(title="Badminton Roster API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
