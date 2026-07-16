"""DJAGA FastAPI application: API routers plus production SPA hosting."""
from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from assistant.chat import stream_reply
from auth import current_user, login, logout, mydigital_login, register
from config import settings
from contracts import User
from db import get_check, get_feed, get_verdict, init_db, list_checks, set_language
from jobs.harvester import harvest
from pipeline import manager

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="DJAGA", version="1.0.0")
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.on_event("startup")
async def startup() -> None:
    init_db()
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


@app.post("/api/feed/refresh")
async def refresh_feed(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    return await asyncio.to_thread(harvest)


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
    return {"ok": True, "agents": {name: settings.agent_mode_for(name) for name in settings.agent_names}, "mode": settings.agent_mode}


@app.get("/{path:path}")
def spa(path: str):
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(503, "Frontend is not built. Run npm run build in frontend/.")
