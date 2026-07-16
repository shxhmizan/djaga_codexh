"""DJAGA FastAPI application: API routers plus production SPA hosting."""
from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from pathlib import Path

from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from assistant.chat import stream_reply
from auth import current_user, login, logout, mydigital_login, register
from config import settings
from contracts import FeedItem, User, Verdict
from db import create_check as db_create_check, get_check, get_feed, get_intelligence, get_verdict, init_db, list_checks, save_community_report, save_verdict, set_language, upsert_feed
from jobs.harvester import harvest
from pipeline import manager
from report_analyzer import analyze_report, coordinates_for
from integrations.semakmule_mock import lookup as semakmule_lookup

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="DJAGA", version="1.0.0")
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.on_event("startup")
async def startup() -> None:
    init_db()
    from scripts.migrate_frontend_intelligence import ensure_seeded
    ensure_seeded()
    # Seed data is part of a usable zero-key installation, not an API-response mock.
    harvest(seed_only=True)


def require_user(token: str | None) -> User:
    user = current_user(token)
    if not user:
        raise HTTPException(401, "Please sign in to continue")
    return user


@app.post("/api/auth/register")
def api_register(payload: dict):
    return register(payload)


@app.post("/api/auth/login")
def api_login(payload: dict):
    return login(payload)


@app.post("/api/auth/mydigitalid")
def api_mydigital():
    return mydigital_login()


@app.post("/api/auth/logout")
def api_logout(djaga_session: str | None = Cookie(None)):
    return logout(djaga_session)


@app.get("/api/auth/me")
def api_me(djaga_session: str | None = Cookie(None)):
    return {"user": current_user(djaga_session)}


@app.post("/api/profile/language")
def api_language(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    language = payload.get("language", "en")
    if language not in {"en", "ms", "zh", "ta"}:
        raise HTTPException(422, "Unsupported language")
    return {"user": set_language(user.id, language)}


@app.post("/api/checks")
async def create_check(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    kind = payload.get("kind", "call")
    if kind not in {"call", "voice", "image", "message"}:
        raise HTTPException(422, "Unsupported check kind")
    session_id = await manager.create(user.id, kind)
    return {"session_id": session_id, "kind": kind}


@app.post("/api/checks/{session_id}/chunk")
async def upload_chunk(session_id: str, audio: UploadFile = File(...), djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    if audio.content_type not in {"audio/mp4", "audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg"}:
        raise HTTPException(415, "Use an audio/mp4, audio/webm, or audio/wav recording")
    data = await audio.read()
    await manager.add_chunk(session_id, user.id, data, audio.content_type or "audio/mp4")
    return {"ok": True, "bytes_received": len(data)}


@app.post("/api/checks/{session_id}/analyze")
async def analyze_check(
    session_id: str,
    request: Request,
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
    djaga_session: str | None = Cookie(None),
):
    user = require_user(djaga_session)
    # JSON text is useful for the message scanner; multipart supports uploads.
    if request.headers.get("content-type", "").startswith("application/json"):
        body = await request.json()
        text = body.get("text", text)
    data = await file.read() if file else None
    await manager.analyze(session_id, user.id, text=text, blob=data, content_type=file.content_type if file else None)
    return {"ok": True, "session_id": session_id}


@app.get("/api/checks")
def api_checks(djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    return list_checks(user.id)


@app.get("/api/checks/{session_id}/verdict")
def api_verdict(session_id: str, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    check = get_check(session_id, user.id)
    if not check:
        raise HTTPException(404, "Check not found")
    return get_verdict(session_id) or {}


async def event_generator(session_id: str):
    cursor = 0
    last_beat = time.monotonic()
    while True:
        events, complete = await manager.events_since(session_id, cursor)
        for event in events:
            cursor += 1
            yield f"event: {event.type}\ndata: {event.model_dump_json()}\n\n"
        if complete and not events:
            break
        if time.monotonic() - last_beat >= 15:
            yield ": heartbeat\n\n"
            last_beat = time.monotonic()
        await asyncio.sleep(0.35)


@app.get("/api/checks/{session_id}/stream")
async def check_stream(session_id: str, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    if not get_check(session_id, user.id):
        raise HTTPException(404, "Check not found")
    return StreamingResponse(event_generator(session_id), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/feed")
def api_feed(type: str | None = None, limit: int = 60, djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    return get_feed(type, min(max(limit, 1), 100))


@app.get("/api/intelligence")
def api_intelligence(djaga_session: str | None = Cookie(None)):
    """Database-backed map, intelligence panel, and statistics data."""
    require_user(djaga_session)
    kinds = ("map_points", "scam_types", "city_stats", "insights", "live_stats", "top_accounts", "top_phones", "monthly_trend")
    return {kind: get_intelligence(kind) for kind in kinds}


@app.post("/api/feed/refresh")
async def refresh_feed(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    return await asyncio.to_thread(harvest)


@app.post("/api/reports/analyze")
def analyze_community_report(payload: dict, djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    description = str(payload.get("description", "")).strip()
    if len(description) < 12:
        raise HTTPException(422, "Please provide a little more detail about the scam.")
    return analyze_report(description, payload.get("submitted_type"), payload.get("phone_link"))


@app.post("/api/reports")
def submit_community_report(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    description = str(payload.get("description", "")).strip()
    if len(description) < 12:
        raise HTTPException(422, "Please provide a little more detail about the scam.")
    consent_public = bool(payload.get("consent_public"))
    analysis = analyze_report(description, payload.get("submitted_type"), payload.get("phone_link"))
    report_id = str(uuid.uuid4())
    location = str(payload.get("location", "")).strip()
    occurred_when = str(payload.get("occurred_when", "")).strip()
    save_community_report({
        "id": report_id, "user_id": user.id, "description": description,
        "submitted_type": payload.get("submitted_type"), "phone_link": str(payload.get("phone_link", "")).strip(),
        "location": location, "occurred_when": occurred_when, "consent_public": consent_public,
        "status": "community_unverified", "ai_type": analysis["type"], "ai_title": analysis["title"],
        "ai_summary": analysis["summary"], "confidence": analysis["confidence"], "entities": analysis["entities"],
        "created_at": time.time(),
    })
    if consent_public:
        lat, lng, region = coordinates_for(location)
        upsert_feed([FeedItem(
            scam_type=analysis["type"], title=analysis["title"], summary=analysis["summary"], region=region,
            lat=lat, lng=lng, source_name="DJAGA community report · AI classified", source_url=f"https://djaga.local/community/{report_id}",
            date=time.strftime("%Y-%m-%d"),
        )])
    return {"id": report_id, "analysis": analysis, "status": "community_unverified", "published": consent_public}


@app.post("/api/scam-check/identifier")
def check_identifier(payload: dict, djaga_session: str | None = Cookie(None)):
    """Checks an identifier against the mock registry and the live DJAGA feed."""
    user = require_user(djaga_session)
    value = str(payload.get("value", "")).strip()
    if not value or len(value) > 500:
        raise HTTPException(422, "Enter a phone number, bank account, or link to check.")
    digits = re.sub(r"\D", "", value)
    if re.match(r"^(https?://)?[^\s/]+\.[^\s]+", value, re.I):
        kind = "link"
    elif re.match(r"^(?:\+?60|0)\d{8,10}$", re.sub(r"[\s-]", "", value)):
        kind = "phone"
    elif 8 <= len(digits) <= 18:
        kind = "bank_account"
    else:
        raise HTTPException(422, "That does not look like a phone number, bank account, or web link.")
    registry = semakmule_lookup(value)
    matches = [item for item in get_feed(limit=100) if value.lower() in (item["title"] + item["summary"]).lower()]
    report_count = int(registry.get("report_count", 0)) + len(matches)
    risk = 0.78 if report_count else 0.18
    level = "danger" if risk >= settings.danger_threshold else "safe"
    label = {"phone": "phone number", "link": "web link", "bank_account": "bank account"}[kind]
    evidence = [
        {"agent": "registry", "claim": f"SemakMule MOCK returned {registry.get('report_count', 0)} seeded report(s) for this {label}.", "weight_contribution": 0.75},
        {"agent": "osint", "claim": f"DJAGA feed found {len(matches)} matching intelligence alert(s).", "weight_contribution": 0.25},
    ]
    check_id = str(uuid.uuid4())
    db_create_check(check_id, user.id, "message")
    verdict = Verdict(risk=risk, level=level, kind="message", evidence=evidence, excerpt=f"Identifier check: {kind}", flagged_phrases=[])
    save_verdict(check_id, verdict)
    return {"check_id": check_id, "kind": kind, "risk": risk, "level": level, "registry": registry, "feed_matches": matches[:3], "evidence": evidence}


@app.post("/api/chat")
async def chat(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    message = str(payload.get("message", "")).strip()
    if not message:
        raise HTTPException(422, "Message is required")
    return StreamingResponse(stream_reply(user, message), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.post("/api/chat/speak")
async def chat_speak(payload: dict, djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    from integrations.elevenlabs_client import synthesize
    return await synthesize(str(payload.get("text", "")))


@app.post("/api/chat/listen")
async def chat_listen(audio: UploadFile = File(...), djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    from integrations.elevenlabs_client import transcribe_audio
    return {"text": await transcribe_audio(await audio.read(), audio.content_type or "audio/mp4")}


@app.get("/api/demo/stream")
async def demo_stream():
    session_id = await manager.create("demo", "call", demo=True)
    session = manager.sessions[session_id]
    asyncio.create_task(manager.run(session))
    return StreamingResponse(event_generator(session_id), media_type="text/event-stream")


@app.get("/healthz")
def health():
    return {"ok": True, "agents": {name: settings.agent_mode_for(name) for name in settings.agent_names}, "mode": settings.agent_mode, "langgraph": manager.graph_for("call") is not None}


@app.get("/{path:path}")
def spa(path: str):
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(503, "Frontend is not built. Run npm run build in frontend/.")
