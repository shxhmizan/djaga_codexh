from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field

class TraceEvent(BaseModel):
    type: Literal["trace", "risk", "transcript", "chat"]
    agent: str | None
    ts: float
    status: Literal["started", "evidence", "done", "unavailable", "error"]
    message: str
    score: float | None = None
    evidence: dict[str, Any] | None = None

class AgentResult(BaseModel):
    agent: str
    score: float | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    unavailable: bool = False

class Verdict(BaseModel):
    risk: float
    level: Literal["safe", "caution", "danger"]
    kind: Literal["call", "voice", "image", "message"]
    evidence: list[dict[str, Any]]
    excerpt: str | None = None
    flagged_phrases: list[str] = Field(default_factory=list)

class FeedItem(BaseModel):
    scam_type: str
    title: str
    summary: str
    region: str
    lat: float
    lng: float
    source_name: str
    source_url: str
    date: str

class User(BaseModel):
    id: str
    email: str
    name: str
    language: Literal["ms", "en", "zh", "ta"] = "en"
    auth_method: Literal["password", "mydigitalid_sim"] = "password"
