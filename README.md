# DJAGA

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
uvicorn app:app --reload
```

For frontend-only hot reload, use `cd frontend && npm run dev` in another terminal.
Run tests with `python3 -m pytest -q`. Copy `.env.example` to `.env` (or set the variables in your shell) only when enabling real integrations.

## Supabase

Create a local `.env` containing `SUPABASE_DB_URL` with the pooled PostgreSQL connection string from Supabase **Connect** (include `?sslmode=require`). DJAGA applies [the schema migration](migrations/001_initial.sql) when it starts. To copy existing local data once, run `SUPABASE_DB_URL='…' python3 scripts/migrate_sqlite_to_supabase.py`.

Verify the connection without exposing credentials: `python3 scripts/test_supabase_connection.py`.
