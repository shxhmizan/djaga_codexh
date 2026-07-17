"""Audio transcription using ElevenLabs Scribe or Gemini audio input."""
from __future__ import annotations

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.elevenlabs_client import transcribe_audio
from integrations.openrouter_client import analyse_voice_audio


class TranscribeAgent:
    async def run(self, **kwargs):
        if settings.agent_mode_for("transcribe") != "real":
            return await mock_agents.transcribe(**kwargs)
        blob = kwargs.get("blob")
        content_type = str(kwargs.get("content_type") or "audio/mp4")
        if not blob:
            return AgentResult(agent="transcribe", unavailable=True, payload={"claim": "No audio was available for transcription."})
        if settings.elevenlabs_api_key:
            transcript = await transcribe_audio(blob, content_type)
            return AgentResult(agent="transcribe", payload={"transcript": transcript, "provider": "elevenlabs", "claim": "ElevenLabs Scribe transcribed the uploaded voice note."})
        result = await analyse_voice_audio(blob, content_type)
        transcript = result["transcript"]
        if not transcript:
            return AgentResult(agent="transcribe", unavailable=True, payload={"claim": "Gemini could not extract a usable transcript from this audio."})
        return AgentResult(agent="transcribe", payload={"transcript": transcript, "provider": "openrouter", "model": result["model"], "claim": "Gemini transcribed the uploaded voice note."})
