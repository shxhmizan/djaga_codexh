"""Image authenticity agent backed by a local Hugging Face classifier."""
from __future__ import annotations

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.huggingface_image import classify_image


class ImageForensicsAgent:
    async def run(self, **kwargs):
        if settings.agent_mode_for("image_forensics") != "real":
            return await mock_agents.image_forensics(**kwargs)
        blob = kwargs.get("blob")
        if not blob:
            return await mock_agents.image_forensics(**kwargs)
        result = await classify_image(blob)
        score = round(float(result["score"]), 3)
        predictions = result["predictions"]
        artifacts = [f"{item['label']}: {item['score']:.0%}" for item in predictions]
        claim = f"Image authenticity model scored likely synthetic/manipulated content at {score:.0%}."
        return AgentResult(agent="image_forensics", score=score, payload={"artifacts": artifacts, "predictions": predictions, "model": result["model"], "image_size": result["size"], "claim": claim})
