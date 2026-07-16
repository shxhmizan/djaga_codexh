"""Persist the zero-key DJAGA intelligence fixtures in the configured database."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from db import init_db
from jobs.harvester import harvest

init_db()
print(harvest(seed_only=True))
