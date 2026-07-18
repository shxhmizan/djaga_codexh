"""DJAGA FastAPI application: API routers plus production SPA hosting."""
from __future__ import annotations

import asyncio
import hmac
import json
import re
import time
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import Cookie, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from assistant.chat import stream_reply
from assistant.tools import knowledge_base_snapshot, voice_grounding_context
from auth import change_password, current_user, login, logout, mydigital_login, register
from config import settings
from contracts import FeedItem, User, Verdict
from db import clear_user_history, create_check as db_create_check, get_check, get_feed, get_feed_report, get_intelligence, get_intelligence_record, get_recent_feed, get_user_settings, get_verdict, init_db, list_checks, normalize_feed_source_names, save_community_report, save_user_settings, save_verdict, set_intelligence_record, set_language, top_identifier_match, update_user_name, upsert_feed, weekly_intelligence_snapshot
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


@app.patch("/api/profile")
def api_profile(payload: dict, djaga_session: str | None = Cookie(None)):
    user = require_user(djaga_session)
    name = str(payload.get("name", "")).strip()
    if not 2 <= len(name) <= 80:
        raise HTTPException(422, "Enter a name between 2 and 80 characters")
    return {"user": update_user_name(user.id, name)}


@app.get("/api/profile/settings")
def api_profile_settings(djaga_session: str | None = Cookie(None)):
    return get_user_settings(require_user(djaga_session).id)


@app.put("/api/profile/settings")
def api_save_profile_settings(payload: dict, djaga_session: str | None = Cookie(None)):
    return save_user_settings(require_user(djaga_session).id, payload)


@app.post("/api/profile/password")
def api_profile_password(payload: dict, djaga_session: str | None = Cookie(None)):
    change_password(require_user(djaga_session), payload)
    return {"ok": True}


@app.delete("/api/profile/history")
def api_clear_profile_history(djaga_session: str | None = Cookie(None)):
    clear_user_history(require_user(djaga_session).id)
    return {"ok": True}


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
        voice_content_type = _normalise_voice_content_type(file) if file else None
        if not voice_content_type:
            raise HTTPException(415, "Voice checks require an M4A, MP3, WAV, WebM, or OGG upload")
    await manager.analyze(session_id, user.id, text=text, blob=data, content_type=voice_content_type if kind == "voice" else file.content_type if file else None)
    return {"ok": True, "session_id": session_id}


def _normalise_voice_content_type(file: UploadFile) -> str | None:
    """Accept browser MediaRecorder containers even when they use video/webm.

    Chrome commonly labels an audio-only WebM recording ``video/webm`` and
    some browsers add a ``; codecs=...`` suffix. The filename is used only to
    normalise a generic MIME type, never as a substitute for upload limits.
    """
    content_type = (file.content_type or "").lower().split(";", 1)[0].strip()
    allowed = {
        "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/mpeg", "audio/mp3",
        "audio/wav", "audio/x-wav", "audio/webm", "video/webm", "audio/ogg", "audio/aac",
    }
    if content_type in allowed:
        return "audio/webm" if content_type == "video/webm" else content_type
    suffix = (file.filename or "").lower().rsplit(".", 1)[-1]
    inferred = {"m4a": "audio/x-m4a", "mp3": "audio/mpeg", "wav": "audio/wav", "webm": "audio/webm", "ogg": "audio/ogg", "aac": "audio/aac"}.get(suffix)
    return inferred if content_type in {"", "application/octet-stream"} else None


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
    records = get_recent_feed(days=7, limit=min(max(limit, 1), 100))
    return [record for record in records if not type or record["scam_type"].lower() == type.lower()]


@app.get("/api/feed/reports/{report_id}")
def api_feed_report(report_id: int, djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    report = get_feed_report(report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@app.get("/api/intelligence")
def api_intelligence(djaga_session: str | None = Cookie(None)):
    """Database-backed map, intelligence panel, and statistics data."""
    require_user(djaga_session)
    kinds = ("scam_types", "top_accounts", "top_phones")
    payload = {kind: get_intelligence(kind) for kind in kinds}
    # Map pins, state activity, and every Statistics number share one recent
    # seven-day feed snapshot. This prevents UI-only fixture totals drifting
    # away from what the user can actually see in the database-backed feed.
    payload.update(weekly_intelligence_snapshot(days=7))
    payload["insights"] = get_intelligence("modus_operandi")
    return payload


@app.post("/api/feed/refresh")
async def refresh_feed(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    result = await asyncio.to_thread(harvest)
    result["modus_operandi"] = await refresh_modus_operandi()
    result["elevenlabs_knowledge_base"] = await _sync_elevenlabs_knowledge_base()
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
    # Vague reports are retained privately for review but are not presented as
    # public scam intelligence until the analyser identifies a real category.
    publishable = consent_public and analysis["type"] not in {"other", "unclear", "unsure"} and analysis["confidence"] >= 0.60
    if publishable:
        lat, lng, region = coordinates_for(location)
        upsert_feed([FeedItem(
            scam_type=analysis["type"], title=analysis["title"], summary=analysis["summary"], region=region,
            lat=lat, lng=lng, source_name="DJAGA community report · AI classified", source_url=f"https://djaga.local/community/{report_id}",
            date=time.strftime("%Y-%m-%d"),
        )])
    return {"id": report_id, "analysis": analysis, "status": "community_unverified", "published": publishable}


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


@app.get("/api/elevenlabs/conversation")
async def elevenlabs_conversation(djaga_session: str | None = Cookie(None)):
    require_user(djaga_session)
    from integrations.elevenlabs_client import conversation_config
    return await conversation_config(voice_grounding_context()["context"])


@app.post("/api/elevenlabs/tools/feed-search")
async def elevenlabs_feed_search(payload: dict, request: Request):
    """ElevenLabs custom-tool callback for live Supabase/feed grounding.

    Configure this endpoint in the ElevenLabs Agent dashboard with the
    ``x-djaga-tool-secret`` header. It intentionally returns public feed data
    only—never a DJAGA user's profile, chat, or saved checks.
    """
    secret = request.headers.get("x-djaga-tool-secret", "")
    if not settings.elevenlabs_tool_secret or not hmac.compare_digest(secret, settings.elevenlabs_tool_secret):
        raise HTTPException(401, "Invalid ElevenLabs tool credential")
    return voice_grounding_context(str(payload.get("query", "")))


@app.get("/api/elevenlabs/knowledge-base.txt", response_class=PlainTextResponse)
def elevenlabs_knowledge_base() -> PlainTextResponse:
    """Public 7-day feed snapshot for ElevenLabs' URL-based Knowledge Base."""
    return PlainTextResponse(
        knowledge_base_snapshot(),
        headers={"Cache-Control": "public, max-age=300"},
    )


def _stored_elevenlabs_kb_document_id() -> str:
    if settings.elevenlabs_kb_document_id:
        return settings.elevenlabs_kb_document_id
    state = get_intelligence_record("integration_state", "elevenlabs_knowledge_base") or {}
    return str(state.get("document_id", ""))


async def _sync_elevenlabs_knowledge_base() -> dict:
    """Synchronise a database-derived public snapshot with ElevenLabs.

    The first sync can create the text document. Its ID is persisted in
    Supabase/SQLite so future feed refreshes update the same document.
    """
    from integrations.elevenlabs_client import sync_knowledge_base_document
    result = await sync_knowledge_base_document(
        knowledge_base_snapshot(), _stored_elevenlabs_kb_document_id(),
    )
    if result.get("ok") and result.get("document_id") and not settings.elevenlabs_kb_document_id:
        set_intelligence_record(
            "integration_state", "elevenlabs_knowledge_base",
            {"document_id": result["document_id"], "updated_at": time.time()},
        )
    return result


@app.post("/api/elevenlabs/knowledge-base/sync")
async def sync_elevenlabs_knowledge_base(djaga_session: str | None = Cookie(None)):
    """Manually sync public Supabase intelligence to the ElevenLabs KB."""
    require_user(djaga_session)
    return await _sync_elevenlabs_knowledge_base()


@app.get("/api/elevenlabs/knowledge-base/status")
async def elevenlabs_knowledge_base_status(djaga_session: str | None = Cookie(None)):
    """Expose configuration state without leaking any provider credential."""
    require_user(djaga_session)
    document_id = _stored_elevenlabs_kb_document_id()
    return {
        "configured": bool(settings.elevenlabs_api_key),
        "document_id": document_id or None,
        "source": "SUPABASE public seven-day feed",
        "private_data_included": False,
    }


@app.get("/api/demo/stream")
async def demo_stream():
    session_id = await manager.create("demo", "call", demo=True)
    session = manager.sessions[session_id]
    asyncio.create_task(manager.run(session))
    return StreamingResponse(event_generator(session_id), media_type="text/event-stream")


@app.get("/healthz")
def health():
    return {"ok": True, "agents": {name: settings.agent_mode_for(name) for name in settings.agent_names}, "mode": settings.agent_mode, "langgraph": manager.graph_for("call") is not None}


@app.get("/api/healthz")
def api_health():
    """Authenticated UI-friendly alias; preserves the public deployment probe."""
    return health()


@app.get("/{path:path}")
def spa(path: str):
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(503, "Frontend is not built. Run npm run build in frontend/.")
