"""Image authenticity agent backed by a local Hugging Face classifier."""
from __future__ import annotations

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.huggingface_image import classify_image
from integrations.openrouter_client import analyse_image_authenticity


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
        # Gemini via OpenRouter is the preferred production path. The local
        # HF classifier remains a keyless resilience fallback for development
        # or an upstream provider outage.
        if settings.openrouter_api_key:
            try:
                result = await analyse_image_authenticity(blob, str(kwargs.get("content_type") or "image/jpeg"))
                score = round(float(result["synthetic_probability"]), 3)
                artifacts = result["artifacts"]
                top = {"label": result["label"], "score": 1.0 - score if result["label"] == "likely_authentic" else score}
                claim = f"DJAGA agent analysis: {result['claim']} Synthetic-image probability: {score:.0%}."
                provider = result["provider"]
                model = result["model"]
                predictions = [{"label": top["label"], "score": top["score"]}]
            except Exception:
                # Preserve a functional scanner when the paid provider is
                # momentarily unavailable; the fallback remains clearly named.
                result = await classify_image(blob)
                score = round(float(result["score"]), 3)
                predictions = result["predictions"]
                artifacts = [f"{item['label']}: {item['score']:.0%}" for item in predictions]
                top = predictions[0] if predictions else {"label": "unknown", "score": 0.0}
                claim = f"Local image authenticity model classified the upload as {top['label']} ({top['score']:.0%}); synthetic-image probability is {score:.0%}."
                provider = "huggingface-fallback"
                model = result["model"]
        else:
            result = await classify_image(blob)
            score = round(float(result["score"]), 3)
            predictions = result["predictions"]
            artifacts = [f"{item['label']}: {item['score']:.0%}" for item in predictions]
            top = predictions[0] if predictions else {"label": "unknown", "score": 0.0}
            claim = f"Local image authenticity model classified the upload as {top['label']} ({top['score']:.0%}); synthetic-image probability is {score:.0%}."
            provider = "huggingface"
            model = result["model"]
        return AgentResult(
            agent="image_forensics",
            score=score,
            payload={
                "artifacts": artifacts,
                "predictions": predictions,
                "model": model,
                "provider": provider,
                "image_size": result.get("size"),
                "synthetic_probability": score,
                "top_label": top["label"],
                "top_label_probability": top["score"],
                "claim": claim,
            },
        )
