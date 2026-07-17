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
            return AgentResult(
                agent="image_forensics",
                unavailable=True,
                payload={"claim": "No image bytes were available for authenticity analysis."},
            )
        result = await classify_image(blob)
        score = round(float(result["score"]), 3)
        predictions = result["predictions"]
        artifacts = [f"{item['label']}: {item['score']:.0%}" for item in predictions]
        top = predictions[0] if predictions else {"label": "unknown", "score": 0.0}
        assessment = "likely synthetic or manipulated" if score >= 0.5 else "not strongly synthetic"
        claim = (
            f"Image authenticity model classified the upload as {top['label']} ({top['score']:.0%}); "
            f"synthetic-image probability is {score:.0%} ({assessment})."
        )
        return AgentResult(
            agent="image_forensics",
            score=score,
            payload={
                "artifacts": artifacts,
                "predictions": predictions,
                "model": result["model"],
                "image_size": result["size"],
                "synthetic_probability": score,
                "top_label": top["label"],
                "top_label_probability": top["score"],
                "claim": claim,
            },
        )
