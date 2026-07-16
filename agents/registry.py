"""Known-script and identifier registry checks.

SemakMule remains deliberately mocked: the public portal is CAPTCHA-protected
and has no API. Script similarity is real, using Databricks Vector Search when
configured or DJAGA's persisted feed/community reports otherwise.
"""
from __future__ import annotations

import re

import mock_agents
from config import settings
from contracts import AgentResult
from db import registry_candidates
from integrations.semakmule_mock import lookup
from integrations.vector_search_client import search_scripts


def _identifier(text: str) -> str | None:
    match = re.search(r"(?:\+?60|0)\d[\d\s-]{7,12}", text)
    return match.group(0) if match else None


def _score(matches: list[dict]) -> float:
    if not matches:
        return 0.08
    top = matches[0].get("similarity", matches[0].get("score", 0.45))
    try:
        return round(min(0.92, 0.25 + float(top) * 0.67), 3)
    except (TypeError, ValueError):
        return 0.52


class RegistryAgent:
    async def run(self, **kwargs):
        text = (kwargs.get("text") or "").strip()
        if settings.agent_mode_for("registry") != "real":
            return await mock_agents.registry(text=text)

        # An index is a production optimisation. The local repository remains
        # a real, useful corpus when a workspace index is not configured.
        if settings.vs_endpoint and settings.vs_index:
            matches = await search_scripts(text)
            source = "databricks_vector_search"
        else:
            matches = registry_candidates(text)
            source = "djaga_persisted_intelligence"
        semak = lookup(_identifier(text) or text[:80])
        score = _score(matches)
        report_count = len(matches) + int(semak.get("report_count", 0))
        descriptions = [str(item.get("title") or item.get("text") or item.get("summary") or "Known scam-script match") for item in matches[:3]]
        claim = (
            f"{len(matches)} related record{'s' if len(matches) != 1 else ''} found in DJAGA intelligence; "
            f"SemakMule is shown as MOCK with {semak.get('report_count', 0)} seeded reports."
        )
        return AgentResult(
            agent="registry",
            score=score,
            payload={"matches": descriptions, "report_count": report_count, "mock": True, "semakmule": semak, "source": source, "claim": claim},
        )
