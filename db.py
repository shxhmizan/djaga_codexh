"""Small SQLite repository. Audio blobs are intentionally never persisted."""
from __future__ import annotations
import json
import logging
import re
import sqlite3
import time
from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Any
from config import settings
from contracts import FeedItem, User, Verdict

IS_POSTGRES = bool(settings.database_url)
logger = logging.getLogger(__name__)

class PostgresConnection:
    """DB-API-shaped adapter allowing repositories to stay database-agnostic."""
    def __init__(self):
        import psycopg
        from psycopg.rows import dict_row
        # Supabase's transaction pooler does not retain psycopg prepared
        # statements across requests, so disable automatic preparation.
        self.raw = psycopg.connect(settings.database_url, row_factory=dict_row, prepare_threshold=None)
    def execute(self, sql: str, params=()):
        return self.raw.execute(sql.replace("?", "%s"), params)
    def __enter__(self): return self
    def __exit__(self, exc_type, exc, tb):
        self.raw.commit() if exc_type is None else self.raw.rollback()
        self.raw.close()

def connection():
    if IS_POSTGRES:
        return PostgresConnection()
    con = sqlite3.connect(settings.db_path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con

def init_db() -> None:
    global IS_POSTGRES
    if IS_POSTGRES:
        try:
            from pathlib import Path
            with connection() as con:
                for statement in Path(__file__).with_name("migrations").joinpath("001_initial.sql").read_text().split(";\n"):
                    if statement.strip(): con.execute(statement)
            return
        except Exception as exc:
            # Development must remain usable offline even if a configured
            # Supabase pooler is temporarily unreachable. Production can still
            # use PostgreSQL the moment its connection succeeds on startup.
            logger.warning("Supabase unavailable; using local SQLite for this process: %s", exc)
            IS_POSTGRES = False
    with connection() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,name TEXT NOT NULL,language TEXT NOT NULL,auth_method TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS checks (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,created_at REAL NOT NULL,updated_at REAL NOT NULL,transcript TEXT,flagged_phrases TEXT DEFAULT '[]');
        CREATE TABLE IF NOT EXISTS verdicts (check_id TEXT PRIMARY KEY,risk REAL NOT NULL,level TEXT NOT NULL,kind TEXT NOT NULL,evidence TEXT NOT NULL,excerpt TEXT,flagged_phrases TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS feed_items (id INTEGER PRIMARY KEY AUTOINCREMENT,dedupe_key TEXT UNIQUE NOT NULL,scam_type TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL,region TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,date TEXT NOT NULL,created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS intelligence_records (kind TEXT NOT NULL,record_key TEXT NOT NULL,payload TEXT NOT NULL,updated_at REAL NOT NULL,PRIMARY KEY (kind,record_key));
        CREATE TABLE IF NOT EXISTS community_reports (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,description TEXT NOT NULL,submitted_type TEXT,phone_link TEXT,location TEXT,occurred_when TEXT,consent_public INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,ai_type TEXT NOT NULL,ai_title TEXT NOT NULL,ai_summary TEXT NOT NULL,confidence REAL NOT NULL,entities TEXT NOT NULL DEFAULT '[]',created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY,scam_alerts INTEGER NOT NULL DEFAULT 1,private_analysis INTEGER NOT NULL DEFAULT 0,email_updates INTEGER NOT NULL DEFAULT 1,updated_at REAL NOT NULL);
        """)
        # Migrate the very early prototype schema in-place for existing local installs.
        user_columns={row['name'] for row in con.execute("PRAGMA table_info(users)").fetchall()}
        if 'password_hash' not in user_columns:
            con.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        if 'auth_method' not in user_columns:
            con.execute("ALTER TABLE users ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password'")

def row_user(row: sqlite3.Row | None) -> User | None:
    return User(**dict(row)) if row else None

def create_user(user: User, password_hash: str) -> None:
    with connection() as con:
        con.execute("INSERT INTO users (id,email,password_hash,name,language,auth_method) VALUES (?,?,?,?,?,?)", (user.id,user.email,password_hash,user.name,user.language,user.auth_method))


def user_by_email(email: str) -> tuple[User, str] | None:
    with connection() as con:
        row=con.execute("SELECT * FROM users WHERE email=?", (email.lower(),)).fetchone()
    if not row: return None
    return User(id=row['id'],email=row['email'],name=row['name'],language=row['language'],auth_method=row['auth_method']), row['password_hash']

def user_by_id(user_id: str) -> User | None:
    with connection() as con: row=con.execute("SELECT * FROM users WHERE id=?",(user_id,)).fetchone()
    return row_user(row)

def set_language(user_id: str, language: str) -> User:
    with connection() as con: con.execute("UPDATE users SET language=? WHERE id=?",(language,user_id))
    return user_by_id(user_id)  # type: ignore[return-value]

def update_user_name(user_id: str, name: str) -> User:
    with connection() as con: con.execute("UPDATE users SET name=? WHERE id=?", (name.strip(), user_id))
    return user_by_id(user_id)  # type: ignore[return-value]

def update_password(user_id: str, password_hash: str) -> None:
    with connection() as con: con.execute("UPDATE users SET password_hash=? WHERE id=?", (password_hash, user_id))

def get_user_settings(user_id: str) -> dict[str, Any]:
    with connection() as con:
        row = con.execute("SELECT scam_alerts,private_analysis,email_updates FROM user_settings WHERE user_id=?", (user_id,)).fetchone()
    if not row:
        return {"scam_alerts": True, "private_analysis": False, "email_updates": True}
    return {key: bool(row[key]) for key in ("scam_alerts", "private_analysis", "email_updates")}

def save_user_settings(user_id: str, values: dict[str, Any]) -> dict[str, Any]:
    current = get_user_settings(user_id)
    current.update({key: bool(values[key]) for key in current if key in values})
    with connection() as con:
        if IS_POSTGRES:
            con.execute("INSERT INTO user_settings (user_id,scam_alerts,private_analysis,email_updates,updated_at) VALUES (?,?,?,?,?) ON CONFLICT (user_id) DO UPDATE SET scam_alerts=EXCLUDED.scam_alerts,private_analysis=EXCLUDED.private_analysis,email_updates=EXCLUDED.email_updates,updated_at=EXCLUDED.updated_at", (user_id, current["scam_alerts"], current["private_analysis"], current["email_updates"], time.time()))
        else:
            con.execute("INSERT OR REPLACE INTO user_settings (user_id,scam_alerts,private_analysis,email_updates,updated_at) VALUES (?,?,?,?,?)", (user_id, current["scam_alerts"], current["private_analysis"], current["email_updates"], time.time()))
    return current

def clear_user_history(user_id: str) -> None:
    with connection() as con:
        con.execute("DELETE FROM verdicts WHERE check_id IN (SELECT id FROM checks WHERE user_id=?)", (user_id,))
        con.execute("DELETE FROM checks WHERE user_id=?", (user_id,))
        con.execute("DELETE FROM chat_messages WHERE user_id=?", (user_id,))

def save_session(token_hash: str,user_id: str,expires_at: float) -> None:
    with connection() as con:
        if IS_POSTGRES: con.execute("INSERT INTO sessions VALUES (?,?,?) ON CONFLICT (token_hash) DO UPDATE SET user_id=EXCLUDED.user_id,expires_at=EXCLUDED.expires_at",(token_hash,user_id,expires_at))
        else: con.execute("INSERT OR REPLACE INTO sessions VALUES (?,?,?)",(token_hash,user_id,expires_at))
def session_user(token_hash: str) -> User | None:
    with connection() as con:
        row=con.execute("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?",(token_hash,time.time())).fetchone()
    return user_by_id(row['user_id']) if row else None
def delete_session(token_hash: str) -> None:
    with connection() as con: con.execute("DELETE FROM sessions WHERE token_hash=?",(token_hash,))

def create_check(check_id: str,user_id: str,kind: str) -> None:
    now=time.time()
    with connection() as con: con.execute("INSERT INTO checks (id,user_id,kind,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",(check_id,user_id,kind,"created",now,now))
def update_check(check_id: str,status: str,transcript: str | None = None, flagged: list[str] | None = None) -> None:
    with connection() as con: con.execute("UPDATE checks SET status=?,updated_at=?,transcript=COALESCE(?,transcript),flagged_phrases=COALESCE(?,flagged_phrases) WHERE id=?",(status,time.time(),transcript,json.dumps(flagged) if flagged is not None else None,check_id))
def get_check(check_id: str,user_id: str | None = None) -> dict[str,Any] | None:
    sql="SELECT * FROM checks WHERE id=?"; args=[check_id]
    if user_id: sql += " AND user_id=?";args.append(user_id)
    with connection() as con: row=con.execute(sql,args).fetchone()
    return dict(row) if row else None
def list_checks(user_id: str) -> list[dict[str,Any]]:
    with connection() as con: rows=con.execute("SELECT c.*,v.risk,v.level FROM checks c LEFT JOIN verdicts v ON c.id=v.check_id WHERE user_id=? ORDER BY created_at DESC",(user_id,)).fetchall()
    return [dict(x) for x in rows]
def save_verdict(check_id: str, verdict: Verdict) -> None:
    with connection() as con:
        if IS_POSTGRES:
            con.execute("INSERT INTO verdicts VALUES (?,?,?,?,?,?,?) ON CONFLICT (check_id) DO UPDATE SET risk=EXCLUDED.risk,level=EXCLUDED.level,kind=EXCLUDED.kind,evidence=EXCLUDED.evidence,excerpt=EXCLUDED.excerpt,flagged_phrases=EXCLUDED.flagged_phrases",(check_id, verdict.risk, verdict.level, verdict.kind, json.dumps(verdict.evidence), verdict.excerpt, json.dumps(verdict.flagged_phrases)))
        else: con.execute("INSERT OR REPLACE INTO verdicts VALUES (?,?,?,?,?,?,?)",(check_id, verdict.risk, verdict.level, verdict.kind, json.dumps(verdict.evidence), verdict.excerpt, json.dumps(verdict.flagged_phrases)))
    update_check(check_id,"complete",verdict.excerpt,verdict.flagged_phrases)
def get_verdict(check_id: str) -> dict[str,Any] | None:
    with connection() as con: row=con.execute("SELECT * FROM verdicts WHERE check_id=?",(check_id,)).fetchone()
    if not row:return None
    d=dict(row);return Verdict(risk=d['risk'],level=d['level'],kind=d['kind'],evidence=json.loads(d['evidence']) if isinstance(d['evidence'],str) else d['evidence'],excerpt=d['excerpt'],flagged_phrases=json.loads(d['flagged_phrases']) if isinstance(d['flagged_phrases'],str) else d['flagged_phrases']).model_dump()

def upsert_feed(items: list[FeedItem]) -> int:
    added=0
    with connection() as con:
        for item in items:
            key=f"{item.source_url}|{item.title}".lower()
            sql="INSERT INTO feed_items (dedupe_key,scam_type,title,summary,region,lat,lng,source_name,source_url,date,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
            sql += " ON CONFLICT (dedupe_key) DO NOTHING" if IS_POSTGRES else ""
            if not IS_POSTGRES: sql=sql.replace("INSERT INTO", "INSERT OR IGNORE INTO", 1)
            cur=con.execute(sql,(key,item.scam_type,item.title,item.summary,item.region,item.lat,item.lng,item.source_name,item.source_url,item.date,time.time()))
            added += cur.rowcount
    return added

def normalize_feed_source_names() -> None:
    """Replace a legacy internal source label in records already persisted."""
    with connection() as con:
        con.execute(
            "UPDATE feed_items SET source_name=? WHERE source_name=?",
            ("DJAGA community intelligence", "DJAGA mock intelligence"),
        )

def get_feed(scam_type: str | None=None,limit:int=60) -> list[dict[str,Any]]:
    # Do not surface records whose classification is explicitly unclear in
    # the public alerts list.  They remain stored for moderation/audit use.
    sql="SELECT scam_type,title,summary,region,lat,lng,source_name,source_url,date FROM feed_items WHERE lower(scam_type) NOT IN ('unclear','unsure')";args=[]
    if scam_type: sql+=" AND lower(scam_type)=lower(?)";args=[scam_type]
    sql+=" ORDER BY date DESC, id DESC LIMIT ?";args.append(limit)
    with connection() as con: return [dict(r) for r in con.execute(sql,args).fetchall()]


def weekly_intelligence_snapshot(days: int = 7) -> dict[str, list[dict[str, Any]]]:
    """Return map/statistics records from the same recent feed rows.

    Unlike the old design-time figures, every number returned here is computed
    from ``feed_items``.  A report is considered recent when its source date is
    today or in the preceding ``days - 1`` days.
    """
    today = date.today()
    start = today - timedelta(days=max(1, days) - 1)
    recent: list[dict[str, Any]] = []
    for row in get_feed(limit=500):
        try:
            reported_on = date.fromisoformat(str(row.get("date", ""))[:10])
        except ValueError:
            continue
        if start <= reported_on <= today:
            recent.append({**row, "reported_on": reported_on})

    def map_type(value: str) -> str:
        normalized = value.lower()
        if "cloned" in normalized or "voice" in normalized or "deepfake" in normalized:
            return "deepfake"
        if "invest" in normalized:
            return "invest"
        if "romance" in normalized or "love" in normalized:
            return "love"
        if "phish" in normalized:
            return "phish"
        if "macau" in normalized or "officer" in normalized:
            return "macau"
        return "job"

    map_points = [
        {"id": f"weekly-{index}", "lat": row["lat"], "lng": row["lng"], "type": map_type(row["scam_type"]),
         "count": 1, "area": row["region"], "date": row["date"], "title": row["title"]}
        for index, row in enumerate(recent, 1)
    ]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in recent:
        grouped[str(row["region"])].append(row)
    city_stats = [
        {"id": region.lower().replace(" ", "-"), "city": region, "total": len(rows),
         "topType": map_type(Counter(map_type(item["scam_type"]) for item in rows).most_common(1)[0][0]), "rank": rank}
        for rank, (region, rows) in enumerate(sorted(grouped.items(), key=lambda item: (-len(item[1]), item[0])), 1)
    ]
    today_rows = [row for row in recent if row["reported_on"] == today]
    with connection() as con:
        check_row = con.execute("SELECT COUNT(*) AS total FROM checks WHERE created_at>=?", (time.mktime(today.timetuple()),)).fetchone()
    most_affected = city_stats[0]["city"] if city_stats else "—"
    live_stats = [{
        "id": "current", "totalReportsToday": len(today_rows), "activeAlerts": len(recent),
        "newSinceYesterday": len(today_rows), "mostAffectedCity": most_affected,
        "topScamType": map_type(recent[0]["scam_type"]) if recent else "—",
        "aiScansToday": int(check_row["total"]), "windowDays": days,
    }]
    # A six-month graph from the same persisted feed dates.  Months with no
    # rows remain visible as zero rather than being filled with invented data.
    month_keys: list[tuple[int, int]] = []
    cursor = today.replace(day=1)
    for _ in range(6):
        month_keys.append((cursor.year, cursor.month))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    monthly_counts = Counter((row["reported_on"].year, row["reported_on"].month) for row in recent)
    monthly_trend = [
        {"id": f"{year}-{month:02d}", "month": date(year, month, 1).strftime("%b"), "value": monthly_counts[(year, month)]}
        for year, month in reversed(month_keys)
    ]
    return {"map_points": map_points, "city_stats": city_stats, "live_stats": live_stats, "monthly_trend": monthly_trend}


def registry_candidates(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Return locally persisted intelligence ranked by token overlap.

    This is the keyless, real-data Registry fallback. It deliberately queries
    the feed and community reports already stored in Supabase/SQLite rather
    than inventing registry matches when Vector Search is not provisioned.
    """
    tokens = _tokens(query)
    if not tokens:
        return []
    records: list[dict[str, Any]] = []
    with connection() as con:
        feed_rows = con.execute("SELECT title,summary,scam_type,region,source_url FROM feed_items ORDER BY date DESC LIMIT 250").fetchall()
        report_rows = con.execute("SELECT ai_title,ai_summary,ai_type,location,confidence FROM community_reports WHERE status IN ('published','approved','pending') ORDER BY created_at DESC LIMIT 250").fetchall()
    for row in feed_rows:
        item = dict(row)
        corpus = f"{item.get('title', '')} {item.get('summary', '')} {item.get('scam_type', '')}"
        score = _overlap(tokens, _tokens(corpus))
        if score:
            records.append({"title": item["title"], "summary": item["summary"], "scam_type": item["scam_type"], "region": item["region"], "source_url": item["source_url"], "similarity": score, "source": "djaga_feed"})
    for row in report_rows:
        item = dict(row)
        corpus = f"{item.get('ai_title', '')} {item.get('ai_summary', '')} {item.get('ai_type', '')}"
        score = _overlap(tokens, _tokens(corpus))
        if score:
            records.append({"title": item["ai_title"], "summary": item["ai_summary"], "scam_type": item["ai_type"], "region": item.get("location") or "Malaysia", "similarity": score, "source": "community_report"})
    return sorted(records, key=lambda item: item["similarity"], reverse=True)[:limit]


def _tokens(value: str) -> set[str]:
    stop = {"the", "and", "for", "with", "that", "this", "from", "your", "you", "to", "a", "an", "of", "is", "in", "on", "now", "saya", "yang", "dan", "untuk", "ini", "dengan"}
    return {token for token in re.findall(r"[a-z0-9]{3,}", value.lower()) if token not in stop}


def _overlap(query: set[str], candidate: set[str]) -> float:
    common = query & candidate
    if not common:
        return 0.0
    # A small overlap is still useful for scam evidence, but cannot dominate
    # a verdict. The Registry agent caps the eventual score below.
    return round(len(common) / max(1, len(query)), 3)
def add_chat(user_id:str,role:str,content:str)->None:
    with connection() as con:con.execute("INSERT INTO chat_messages (user_id,role,content,created_at) VALUES (?,?,?,?)",(user_id,role,content,time.time()))


def upsert_intelligence(kind: str, records: list[dict[str, Any]], key: str = "id") -> int:
    """Persist intelligence displayed by the product, independent of frontend fixtures."""
    if not records:
        return 0
    now = time.time()
    with connection() as con:
        for index, record in enumerate(records):
            record_key = str(record.get(key, index))
            payload = json.dumps(record)
            if IS_POSTGRES:
                con.execute(
                    "INSERT INTO intelligence_records (kind,record_key,payload,updated_at) VALUES (?,?,?::jsonb,?) "
                    "ON CONFLICT (kind,record_key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=EXCLUDED.updated_at",
                    (kind, record_key, payload, now),
                )
            else:
                con.execute(
                    "INSERT OR REPLACE INTO intelligence_records (kind,record_key,payload,updated_at) VALUES (?,?,?,?)",
                    (kind, record_key, payload, now),
                )
    return len(records)


def replace_intelligence(kind: str, records: list[dict[str, Any]], key: str = "id") -> int:
    """Atomically replace one derived intelligence collection."""
    now = time.time()
    with connection() as con:
        con.execute("DELETE FROM intelligence_records WHERE kind=?", (kind,))
        for index, record in enumerate(records):
            record_key = str(record.get(key, index))
            payload = json.dumps(record)
            if IS_POSTGRES:
                con.execute(
                    "INSERT INTO intelligence_records (kind,record_key,payload,updated_at) VALUES (?,?,?::jsonb,?)",
                    (kind, record_key, payload, now),
                )
            else:
                con.execute(
                    "INSERT INTO intelligence_records (kind,record_key,payload,updated_at) VALUES (?,?,?,?)",
                    (kind, record_key, payload, now),
                )
    return len(records)


def get_intelligence(kind: str) -> list[dict[str, Any]]:
    with connection() as con:
        rows = con.execute(
            "SELECT record_key,payload FROM intelligence_records WHERE kind=? ORDER BY record_key",
            (kind,),
        ).fetchall()
    return [row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"]) for row in rows]


def top_identifier_match(kind: str, value: str) -> dict[str, Any] | None:
    """Find an exact phone/account hit in persisted Top 10 intelligence."""
    digits = re.sub(r"\D", "", value)
    if kind == "phone" and digits.startswith("60"):
        digits = "0" + digits[2:]
    record_kind = "top_phones" if kind == "phone" else "top_accounts"
    for record in get_intelligence(record_kind):
        candidate = re.sub(r"\D", "", str(record.get("identifier", "")))
        if candidate and candidate == digits:
            return {"identifier": str(record["identifier"]), "reports": int(record.get("reports", 0)), "dataset": record_kind}
    return None


def intelligence_count() -> int:
    with connection() as con:
        row = con.execute("SELECT COUNT(*) AS total FROM intelligence_records").fetchone()
    return int(row["total"])


def save_community_report(report: dict[str, Any]) -> None:
    with connection() as con:
        con.execute(
            "INSERT INTO community_reports (id,user_id,description,submitted_type,phone_link,location,occurred_when,consent_public,status,ai_type,ai_title,ai_summary,confidence,entities,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                report["id"], report["user_id"], report["description"], report.get("submitted_type"),
                report.get("phone_link"), report.get("location"), report.get("occurred_when"), report["consent_public"],
                report["status"], report["ai_type"], report["ai_title"], report["ai_summary"],
                report["confidence"], json.dumps(report["entities"]), report["created_at"],
            ),
        )


def get_community_report(report_id: str, user_id: str) -> dict[str, Any] | None:
    with connection() as con:
        row = con.execute("SELECT * FROM community_reports WHERE id=? AND user_id=?", (report_id, user_id)).fetchone()
    if not row:
        return None
    result = dict(row)
    if isinstance(result.get("entities"), str):
        result["entities"] = json.loads(result["entities"])
    return result
