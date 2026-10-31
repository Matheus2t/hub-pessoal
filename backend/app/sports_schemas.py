"""Internal contracts; provider payloads never reach the browser directly."""
from typing import Literal
from pydantic import BaseModel


class Game(BaseModel):
    id: str
    starts_at: str
    home: str
    away: str
    competition: str
    season: str
    venue: str
    is_home: bool
    status: str
    home_score: int | None
    away_score: int | None
    outcome: Literal['V', 'E', 'D'] | None


class Standing(BaseModel):
    team: str
    is_team: bool
    rank: int | None
    points: int | None
    played: int | None
    wins: int | None
    draws: int | None
    losses: int | None
    goal_difference: int | None
    goals_for: int | None = None
    goals_against: int | None = None


class Metric(BaseModel):
    label: str
    value: int


class Player(BaseModel):
    name: str
    position: str
    number: int | None
    height: str | None = None


class SportsSection(BaseModel):
    state: Literal['available', 'empty', 'unavailable', 'error', 'rate_limited']
    items: list[Game | Standing | Player | Metric]
    note: str
    updated_at: str
    source: str
    partial: bool = False
    competition: str | None = None
    season: str | None = None
