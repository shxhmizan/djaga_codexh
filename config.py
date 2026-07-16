"""Configuration is environment-only; no credentials belong in source control."""
from __future__ import annotations
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Local convenience only; Databricks supplies the same values as environment variables.
load_dotenv(Path(__file__).with_name(".env"))

@dataclass(frozen=True)
class Settings:
    db_path: Path = Path(os.getenv("DJAGA_DB_PATH", Path(__file__).with_name("djaga.db")))
    # Supabase exposes managed PostgreSQL. Prefer its pooled connection string in production.
    database_url: str = (lambda value: "" if "YOUR_PERCENT_ENCODED_PASSWORD" in value else value)(os.getenv("SUPABASE_DB_URL", os.getenv("DATABASE_URL", "")))
    session_secret: str = os.getenv("SESSION_SECRET", "development-only-change-me")
    agent_mode: str = os.getenv("AGENT_MODE", "mock").lower()
    behavioral_mode: str = os.getenv("BEHAVIORAL_MODE", "fewshot")
    serving_endpoint: str = os.getenv("SERVING_ENDPOINT", "")
    chat_endpoint: str = os.getenv("CHAT_ENDPOINT", "")
    vs_endpoint: str = os.getenv("VS_ENDPOINT", "")
    vs_index: str = os.getenv("VS_INDEX", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    el_voice_id: str = os.getenv("EL_VOICE_ID", "")
    exa_api_key: str = os.getenv("EXA_API_KEY", "")
    danger_threshold: float = float(os.getenv("DANGER_THRESHOLD", "0.65"))
    caution_threshold: float = float(os.getenv("CAUTION_THRESHOLD", "0.35"))
    mock_delay_scale: float = float(os.getenv("MOCK_DELAY_SCALE", "1"))
    agent_names: tuple[str, ...] = ("intake", "forensics", "image_forensics", "transcribe", "behavioral", "registry", "osint", "verdict")
    audio_weights: dict = None  # type: ignore[assignment]
    text_weights: dict = None  # type: ignore[assignment]
    image_weights: dict = None  # type: ignore[assignment]
    def __post_init__(self):
        object.__setattr__(self, "audio_weights", {"forensics": .25, "behavioral": .35, "registry": .20, "osint": .20})
        object.__setattr__(self, "text_weights", {"behavioral": .50, "registry": .25, "osint": .25})
        object.__setattr__(self, "image_weights", {"image_forensics": .70, "osint": .30})
    def agent_mode_for(self, agent: str) -> str:
        return os.getenv(f"{agent.upper()}_MODE", self.agent_mode).lower()

settings = Settings()
