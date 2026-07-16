"""Small SQLite repository. Audio blobs are intentionally never persisted."""
from __future__ import annotations
import json
import sqlite3
import time
from typing import Any
from config import settings
from contracts import FeedItem, User, Verdict

IS_POSTGRES = bool(settings.database_url)

class PostgresConnection:
    """DB-API-shaped adapter allowing repositories to stay database-agnostic."""
    def __init__(self):
        import psycopg
        from psycopg.rows import dict_row
        self.raw = psycopg.connect(settings.database_url, row_factory=dict_row)
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
    if IS_POSTGRES:
        from pathlib import Path
        with connection() as con:
            for statement in Path(__file__).with_name("migrations").joinpath("001_initial.sql").read_text().split(";\n"):
                if statement.strip(): con.execute(statement)
        return
    with connection() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,name TEXT NOT NULL,language TEXT NOT NULL,auth_method TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS checks (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,created_at REAL NOT NULL,updated_at REAL NOT NULL,transcript TEXT,flagged_phrases TEXT DEFAULT '[]');
        CREATE TABLE IF NOT EXISTS verdicts (check_id TEXT PRIMARY KEY,risk REAL NOT NULL,level TEXT NOT NULL,kind TEXT NOT NULL,evidence TEXT NOT NULL,excerpt TEXT,flagged_phrases TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS feed_items (id INTEGER PRIMARY KEY AUTOINCREMENT,dedupe_key TEXT UNIQUE NOT NULL,scam_type TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL,region TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,source_name TEXT NOT NULL,source_url TEXT NOT NULL,date TEXT NOT NULL,created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at REAL NOT NULL);
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
def get_feed(scam_type: str | None=None,limit:int=60) -> list[dict[str,Any]]:
    sql="SELECT scam_type,title,summary,region,lat,lng,source_name,source_url,date FROM feed_items";args=[]
    if scam_type: sql+=" WHERE lower(scam_type)=lower(?)";args=[scam_type]
    sql+=" ORDER BY date DESC, id DESC LIMIT ?";args.append(limit)
    with connection() as con: return [dict(r) for r in con.execute(sql,args).fetchall()]
def add_chat(user_id:str,role:str,content:str)->None:
    with connection() as con:con.execute("INSERT INTO chat_messages (user_id,role,content,created_at) VALUES (?,?,?,?)",(user_id,role,content,time.time()))
