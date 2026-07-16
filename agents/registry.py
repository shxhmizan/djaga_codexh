"""Known-script and identifier registry checks.

Script similarity uses Databricks Vector Search when configured or DJAGA's
persisted feed and community reports otherwise.
"""
from __future__ import annotations

import re

from config import settings
from contracts import AgentResult
from db import registry_candidates, top_identifier_match
from integrations.vector_search_client import search_scripts


def _identifier(text: str) -> str | None:
    match = re.search(r"(?:\+?60|0)\d[\d\s-]{7,12}", text)
    return match.group(0) if match else None


def _bank_account(text: str) -> str | None:
    match = re.search(r"(?<!\d)\d{8,18}(?!\d)", text.replace(" ", "").replace("-", ""))
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
        phone = _identifier(text)
        bank_account = None if phone else _bank_account(text)
        top_match = top_identifier_match("phone", phone) if phone else top_identifier_match("bank_account", bank_account) if bank_account else None
        if top_match:
            return AgentResult(
                agent="registry",
                score=0.98,
                payload={
                    "matches": [top_match["identifier"]],
                    "report_count": int(top_match["reports"]),
                    "source": "djaga_top10_intelligence",
                    "claim": f"Exact Top 10 database match: {top_match['identifier']} has {top_match['reports']} recorded reports.",
                },
            )

        # An index is a production optimisation. The persisted database is
        # always queried so every scan has a real local intelligence signal.
        if settings.agent_mode_for("registry") == "real" and settings.vs_endpoint and settings.vs_index:
            matches = await search_scripts(text)
            source = "databricks_vector_search"
        else:
            matches = registry_candidates(text)
            source = "djaga_persisted_intelligence"
        score = _score(matches)
        report_count = len(matches)
        descriptions = [str(item.get("title") or item.get("text") or item.get("summary") or "Known scam-script match") for item in matches[:3]]
        claim = (
            f"{len(matches)} related record{'s' if len(matches) != 1 else ''} found in DJAGA intelligence."
        )
        return AgentResult(
            agent="registry",
            score=score,
            payload={"matches": descriptions, "report_count": report_count, "source": source, "claim": claim},
        )
