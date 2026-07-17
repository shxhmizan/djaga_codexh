"""DJAGA FastAPI application: API routers plus production SPA hosting."""
from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from assistant.chat import stream_reply
from auth import current_user, login, logout, mydigital_login, register
from config import settings
from contracts import FeedItem, User, Verdict
from db import create_check as db_create_check, get_check, get_feed, get_intelligence, get_verdict, init_db, list_checks, normalize_feed_source_names, save_community_report, save_verdict, set_language, top_identifier_match, upsert_feed
from jobs.harvester import harvest
from integrations.openrouter_client import extract_text_from_image
from intelligence_engine import refresh_modus_operandi
from pipeline import manager
from report_analyzer import analyze_report, coordinates_for

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="DJAGA", version="1.0.0")
IDENTIFIER_JOBS: dict[str, dict] = {}
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.on_event("startup")
async def startup() -> None:
    init_db()
    from scripts.migrate_frontend_intelligence import ensure_seeded
    ensure_seeded()
    # Seed data is part of a usable zero-key installation, not an API-response mock.
    harvest(seed_only=True)
    normalize_feed_source_names()
    await refresh_modus_operandi()


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
    check = get_check(session_id, user.id)
    if not check:
        raise HTTPException(404, "Check not found")
    # JSON text is useful for the message scanner; multipart supports uploads.
    if request.headers.get("content-type", "").startswith("application/json"):
        body = await request.json()
        text = body.get("text", text)
    data = await file.read() if file else None
    if data is not None and len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Upload a file smaller than 10 MB.")
    kind = check["kind"]
    if kind == "message" and file:
        try:
            extracted = await _extract_message_upload(data or b"", file)
        except RuntimeError as exc:
            raise HTTPException(422, str(exc)) from exc
        text = "\n\n".join(part for part in [text or "", extracted] if part.strip())
    if kind == "message" and not (text or "").strip():
        raise HTTPException(422, "Message checks require text")
    if kind == "image":
        if not file or file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(415, "Image checks require a JPEG, PNG, or WebP upload")
    if kind == "voice":
        if not file or file.content_type not in {"audio/mp4", "audio/x-m4a", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg"}:
            raise HTTPException(415, "Voice checks require an M4A, MP3, WAV, WebM, or OGG upload")
    await manager.analyze(session_id, user.id, text=text, blob=data, content_type=file.content_type if file else None)
    return {"ok": True, "session_id": session_id}


async def _extract_message_upload(data: bytes, file: UploadFile) -> str:
    """Return scan text from a conversation screenshot or document upload."""
    name = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if content_type in {"image/jpeg", "image/png", "image/webp"}:
        return await extract_text_from_image(data, content_type)
    if content_type == "application/pdf" or name.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(data)).pages)
        except Exception as exc:
            raise RuntimeError("DJAGA could not read text from that PDF.") from exc
        if not text.strip():
            raise RuntimeError("No selectable text was found in that PDF. Upload a screenshot instead.")
        return text[:12000]
    if content_type.startswith("text/") or name.endswith((".txt", ".md", ".csv", ".json", ".log")):
        text = data.decode("utf-8", errors="replace").strip()
        if not text:
            raise RuntimeError("That file did not contain readable text.")
        return text[:12000]
    raise RuntimeError("Upload a PNG, JPG, WebP, PDF, TXT, CSV, JSON, or Markdown conversation file.")


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
    kinds = ("map_points", "scam_types", "city_stats", "live_stats", "top_accounts", "top_phones", "monthly_trend")
    payload = {kind: get_intelligence(kind) for kind in kinds}
    payload["insights"] = get_intelligence("modus_operandi")
    return payload


@app.post("/api/feed/refresh")
async def refresh_feed(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    result = await asyncio.to_thread(harvest)
    result["modus_operandi"] = await refresh_modus_operandi()
    return result


@app.post("/api/intelligence/modus-operandi/refresh")
async def refresh_modus_operandi_api(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    return await refresh_modus_operandi(force=True)


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


def _identifier_result(user: User, value: str, log=None) -> dict:
    """Run actual local identifier lookups and produce an auditable verdict."""
    def emit(message: str, status: str = "evidence"):
        if log:
            log(message, status)
    value = value.strip()
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
    emit(f"Normalised the submitted {kind.replace('_', ' ')}.", "started")
    top_match = top_identifier_match(kind, value) if kind in {"phone", "bank_account"} else None
    if top_match:
        emit(f"Database match: identifier appears in DJAGA’s Top 10 {top_match['dataset'].replace('_', ' ')} data with {top_match['reports']} reports.")
    elif kind in {"phone", "bank_account"}:
        emit("Queried DJAGA’s persisted Top 10 identifier records; no exact match found.")
    matches = [item for item in get_feed(limit=100) if value.lower() in (item["title"] + item["summary"]).lower()]
    emit(f"Searched persisted DJAGA feed data; found {len(matches)} direct identifier mention(s).")
    report_count = int(top_match["reports"]) if top_match else len(matches)
    risk = min(0.98, 0.82 + min(report_count, 20) * 0.008) if top_match else 0.72 if matches else 0.18
    level = "danger" if risk >= settings.danger_threshold else "safe"
    evidence = []
    if top_match:
        evidence.append({"agent": "registry", "claim": f"Exact Top 10 database match: {top_match['identifier']} has {top_match['reports']} recorded reports.", "weight_contribution": 0.85, "source": "djaga_database"})
    evidence.append({"agent": "osint", "claim": f"DJAGA feed found {len(matches)} direct identifier match(es).", "weight_contribution": 0.15 if top_match else 1.0})
    check_id = str(uuid.uuid4())
    db_create_check(check_id, user.id, "message")
    verdict = Verdict(risk=risk, level=level, kind="message", evidence=evidence, excerpt=f"Identifier check: {kind}", flagged_phrases=[])
    save_verdict(check_id, verdict)
    emit("Finalised the database-backed identifier risk verdict.", "done")
    return {"check_id": check_id, "kind": kind, "risk": risk, "level": level, "top_match": top_match, "feed_matches": matches[:3], "evidence": evidence}


@app.post("/api/scam-check/identifier")
def check_identifier(payload: dict, djaga_session: str | None = Cookie(None)):
    return _identifier_result(require_user(djaga_session), str(payload.get("value", "")))


async def _run_identifier_job(job_id: str, user: User, value: str) -> None:
    job = IDENTIFIER_JOBS[job_id]
    def log(message: str, status: str = "evidence"):
        job["events"].append({"type": "trace", "agent": "registry", "ts": time.time(), "status": status, "message": message})
    try:
        job["result"] = _identifier_result(user, value, log)
    except Exception as exc:
        job["error"] = str(exc)
        log("Identifier check could not complete.", "error")
    finally:
        job["complete"] = True


@app.post("/api/scam-check/identifier/start")
async def start_identifier_check(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    job_id = str(uuid.uuid4())
    IDENTIFIER_JOBS[job_id] = {"user_id": user.id, "events": [], "complete": False, "result": None, "error": None}
    asyncio.create_task(_run_identifier_job(job_id, user, str(payload.get("value", ""))))
    return {"job_id": job_id}


@app.get("/api/scam-check/identifier/{job_id}/stream")
async def identifier_check_stream(job_id: str, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    job = IDENTIFIER_JOBS.get(job_id)
    if not job or job["user_id"] != user.id:
        raise HTTPException(404, "Identifier check not found")
    async def generate():
        cursor = 0
        while True:
            for event in job["events"][cursor:]:
                cursor += 1
                yield f"event: trace\ndata: {json.dumps(event)}\n\n"
            if job["complete"]:
                if job["result"]:
                    yield f"event: result\ndata: {json.dumps(job['result'])}\n\n"
                elif job["error"]:
                    yield f"event: error\ndata: {json.dumps({'detail': job['error']})}\n\n"
                break
            await asyncio.sleep(.1)
    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


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
