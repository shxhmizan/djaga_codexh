-- Run once in Supabase Dashboard → SQL Editor, or let DJAGA apply it on startup.
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'en', auth_method TEXT NOT NULL DEFAULT 'password');
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS checks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, status TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL, updated_at DOUBLE PRECISION NOT NULL, transcript TEXT, flagged_phrases JSONB NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS verdicts (check_id TEXT PRIMARY KEY REFERENCES checks(id) ON DELETE CASCADE, risk DOUBLE PRECISION NOT NULL, level TEXT NOT NULL, kind TEXT NOT NULL, evidence JSONB NOT NULL, excerpt TEXT, flagged_phrases JSONB NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS feed_items (id BIGSERIAL PRIMARY KEY, dedupe_key TEXT UNIQUE NOT NULL, scam_type TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, region TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, source_name TEXT NOT NULL, source_url TEXT NOT NULL, date TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS chat_messages (id BIGSERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at DOUBLE PRECISION NOT NULL);
CREATE TABLE IF NOT EXISTS intelligence_records (kind TEXT NOT NULL, record_key TEXT NOT NULL, payload JSONB NOT NULL, updated_at DOUBLE PRECISION NOT NULL, PRIMARY KEY (kind, record_key));
CREATE INDEX IF NOT EXISTS checks_user_created_idx ON checks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feed_items_type_date_idx ON feed_items(scam_type, date DESC);
CREATE INDEX IF NOT EXISTS intelligence_records_kind_idx ON intelligence_records(kind);
