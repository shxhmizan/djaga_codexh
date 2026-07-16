"""Voice anti-spoofing agent backed by a local Hugging Face classifier."""
from __future__ import annotations

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.huggingface_audio import classify_audio


class ForensicsAgent:
    async def run(self, **kwargs):
        if settings.agent_mode_for("forensics") != "real":
            return await mock_agents.forensics(**kwargs)
        blob = kwargs.get("blob")
        if not blob:
            return await mock_agents.forensics(**kwargs)
        result = await classify_audio(blob)
        score = round(float(result["score"]), 3)
        labels = result["top_labels"]
        artifacts = [f"Segment {index + 1}: {value:.0%} synthetic likelihood ({labels[index]})" for index, value in enumerate(result["segment_scores"])]
        return AgentResult(agent="forensics", score=score, payload={"acoustic_score": score, "segment_scores": result["segment_scores"], "artifacts": artifacts, "model": result["model"], "claim": f"Voice anti-spoofing analysis averaged {score:.0%} synthetic-voice likelihood across {len(result['segment_scores'])} audio segments."})
