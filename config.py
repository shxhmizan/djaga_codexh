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
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    openrouter_vision_model: str = os.getenv("OPENROUTER_VISION_MODEL", "openai/gpt-4o-mini")
    vs_endpoint: str = os.getenv("VS_ENDPOINT", "")
    vs_index: str = os.getenv("VS_INDEX", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    el_voice_id: str = os.getenv("EL_VOICE_ID", "")
    elevenlabs_agent_id: str = os.getenv("ELEVENLABS_AGENT_ID", "")
    elevenlabs_branch_id: str = os.getenv("ELEVENLABS_BRANCH_ID", "")
    # Keyless local fallback for voice-note transcription. It is intentionally
    # smaller than a hosted Scribe model so a developer can run DJAGA offline.
    local_asr_model: str = os.getenv("LOCAL_ASR_MODEL", "openai/whisper-tiny")
    # Shared only with the ElevenLabs custom-tool configuration. It protects
    # the public-feed lookup endpoint from arbitrary internet callers.
    elevenlabs_tool_secret: str = os.getenv("ELEVENLABS_TOOL_SECRET", "")
    exa_api_key: str = os.getenv("EXA_API_KEY", "")
    # Hugging Face models are loaded lazily so mock-mode installs stay fast and
    # never download model weights during startup.
    image_model_id: str = os.getenv("IMAGE_MODEL_ID", "jacoballessio/ai-image-detect-distilled")
    voice_model_id: str = os.getenv("VOICE_MODEL_ID", "abhishtagatya/wav2vec2-base-960h-itw-deepfake")
    hf_token: str = os.getenv("HF_TOKEN", "")
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
        """Return the requested mode without making one missing key fatal.

        ``AGENT_MODE=mock`` remains the safe default.  A global ``real`` mode
        can be narrowed with e.g. ``AGENT_MODE=real:behavioral,osint`` and an
        explicit ``BEHAVIORAL_MODE=mock`` always wins.  Agents decide whether
        their own credentials are sufficient and otherwise use their mock
        implementation; a configured service that fails is surfaced as an
        unavailable signal by the pipeline.
        """
        # Intake and Verdict are deterministic local pipeline components. They
        # do not contact an external service or fabricate evidence, so they
        # remain real even while provider-backed agents use mock development
        # mode. This also avoids requiring deployment-only environment flags.
        if agent in {"intake", "verdict"}:
            return "real"
        # BEHAVIORAL_MODE already means classifier strategy (fewshot vs
        # Databricks), so its agent override uses the unambiguous suffix below.
        explicit = os.getenv(f"{agent.upper()}_AGENT_MODE")
        if not explicit and agent != "behavioral":
            explicit = os.getenv(f"{agent.upper()}_MODE")
        if explicit:
            return explicit.lower()
        if self.agent_mode.startswith("real:"):
            requested = {item.strip().replace("-", "_") for item in self.agent_mode.split(":", 1)[1].split(",")}
            return "real" if agent in requested else "mock"
        return self.agent_mode

settings = Settings()
