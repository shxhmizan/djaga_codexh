"""Scam-script classifier with Databricks and OpenRouter implementations."""
from __future__ import annotations

import mock_agents
from config import settings
from integrations.databricks_client import classify
from integrations.openrouter_client import classify_scam_text


class BehavioralAgent:
    async def run(self, **kwargs):
        text = (kwargs.get("text") or "").strip()
        if settings.agent_mode_for("behavioral") != "real":
            return await mock_agents.behavioral(text=text)

        # Databricks is the production classifier. Few-shot OpenRouter keeps
        # the same AgentResult shape for teams before their endpoint is live.
        if settings.behavioral_mode.lower() in {"serving", "databricks", "real"}:
            if not settings.serving_endpoint:
                return await mock_agents.behavioral(text=text)
            return await classify(text)
        if settings.behavioral_mode.lower() == "fewshot":
            if not settings.openrouter_api_key:
                return await mock_agents.behavioral(text=text)
            return await classify_scam_text(text)
        raise RuntimeError("BEHAVIORAL_MODE must be fewshot, serving, or databricks")
