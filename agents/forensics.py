"""Voice-scam and authenticity analysis through OpenRouter Gemini audio."""
from __future__ import annotations

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.openrouter_client import analyse_voice_audio


class ForensicsAgent:
    async def run(self, **kwargs):
        if settings.agent_mode_for("forensics") != "real":
            return await mock_agents.forensics(**kwargs)
        blob = kwargs.get("blob")
        if not blob:
            return AgentResult(
                agent="forensics",
                unavailable=True,
                payload={"claim": "No audio was available for voice analysis."},
            )
        result = await analyse_voice_audio(blob, str(kwargs.get("content_type") or "audio/mp4"))
        score = round(float(result["acoustic_score"]), 3)
        artifacts = result["artifacts"] or ["Gemini found no specific audible authenticity cue in this clip."]
        claim = f"Gemini voice analysis: {result['claim']} Potential synthetic-voice signal: {score:.0%}."
        return AgentResult(
            agent="forensics",
            score=score,
            payload={
                "acoustic_score": score,
                "transcript": result["transcript"],
                "voice_summary": result["voice_summary"],
                "patterns": result["patterns"],
                "artifacts": artifacts,
                "provider": result["provider"],
                "model": result["model"],
                "claim": claim,
            },
        )
