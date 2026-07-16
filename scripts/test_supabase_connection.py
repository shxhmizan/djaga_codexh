"""Verify DJAGA can connect to Supabase without exposing credentials."""
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
def main():
    from db import IS_POSTGRES, connection, init_db
    if not IS_POSTGRES:
        sys.exit("SUPABASE_DB_URL is not set. Add it to .env first.")
    try:
        with connection() as con:
            row = con.execute("SELECT current_database() AS database, current_user AS user").fetchone()
        init_db()
        print(f"Connected to Supabase database '{row['database']}' as '{row['user']}'. DJAGA schema is ready.")
    except Exception as exc:
        sys.exit(f"Supabase connection failed: {exc}")

if __name__ == '__main__':
    main()
