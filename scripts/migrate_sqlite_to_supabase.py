"""One-time migration: copy all existing DJAGA SQLite records to Supabase PostgreSQL.

Usage: SUPABASE_DB_URL='postgresql://...' python3 scripts/migrate_sqlite_to_supabase.py
"""
from __future__ import annotations
import os, sqlite3, sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

ROOT=Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env')
SOURCE=Path(os.getenv('DJAGA_SQLITE_SOURCE', ROOT/'djaga.db'))
TARGET=os.getenv('SUPABASE_DB_URL') or os.getenv('DATABASE_URL')
if not TARGET:
    sys.exit('Set SUPABASE_DB_URL to the Supabase pooled Postgres connection string.')
if not SOURCE.exists():
    sys.exit(f'SQLite file not found: {SOURCE}')

def columns(conn,table): return {row['name'] for row in conn.execute(f'PRAGMA table_info({table})').fetchall()}
def rows(conn,table):
    try:return [dict(row) for row in conn.execute(f'SELECT * FROM {table}').fetchall()]
    except sqlite3.OperationalError:return []

src=sqlite3.connect(SOURCE);src.row_factory=sqlite3.Row
with psycopg.connect(TARGET, row_factory=dict_row) as dst:
    for row in rows(src,'users'):
        password=row.get('password_hash') or row.get('password') or ''
        dst.execute("INSERT INTO users (id,email,password_hash,name,language,auth_method) VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,name=EXCLUDED.name,language=EXCLUDED.language,auth_method=EXCLUDED.auth_method",(row['id'],row['email'],password,row.get('name') or row['email'].split('@')[0],row.get('language') or 'en',row.get('auth_method') or 'password'))
    for table, keys in {
        'sessions':['token_hash','user_id','expires_at'],
        'checks':['id','user_id','kind','status','created_at','updated_at','transcript','flagged_phrases'],
        'verdicts':['check_id','risk','level','kind','evidence','excerpt','flagged_phrases'],
        'chat_messages':['id','user_id','role','content','created_at'],
    }.items():
        for row in rows(src,table):
            usable=[key for key in keys if key in row]; values=[row[k] for k in usable]
            dst.execute(f"INSERT INTO {table} ({','.join(usable)}) VALUES ({','.join('%s' for _ in usable)}) ON CONFLICT DO NOTHING",values)
    for row in rows(src,'feed_items'):
        usable=[k for k in ['dedupe_key','scam_type','title','summary','region','lat','lng','source_name','source_url','date','created_at'] if k in row]
        dst.execute(f"INSERT INTO feed_items ({','.join(usable)}) VALUES ({','.join('%s' for _ in usable)}) ON CONFLICT (dedupe_key) DO NOTHING",[row[k] for k in usable])
    # Existing SQLite integer IDs can leave Postgres sequences behind the copied data.
    for table in ('chat_messages','feed_items'):
        dst.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1), true)")
print('Migration complete. Existing legacy SHA-256 passwords remain compatible; users will be upgraded naturally when re-registered.')
