"""Live, entity-led scam intelligence via Exa."""
from __future__ import annotations

import asyncio
import re

import mock_agents
from config import settings
from contracts import AgentResult
from integrations.exa_client import search

_KNOWN_ENTITIES = ("lhdn", "pdrm", "nsrc", "bnm", "bank negara", "maybank", "cimb", "public bank", "rhb", "kwsp", "tng", "touch n go", "pos malaysia", "grab", "shopee", "dhl")


def extract_entities(text: str) -> list[str]:
    """Extract high-signal institutions, URLs, phones and named schemes."""
    found: list[str] = []
    lowered = text.lower()
    for entity in _KNOWN_ENTITIES:
        if entity in lowered:
            found.append(entity.upper() if entity in {"lhdn", "pdrm", "bnm", "nsrc", "kwsp", "cimb", "rhb"} else entity.title())
    found.extend(re.findall(r"(?:https?://)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:/[^\s]*)?", text, re.I))
    found.extend(re.findall(r"(?:\+?60|0)\d[\d\s-]{7,12}", text))
    # Named schemes normally survive as a short title-cased phrase.
    found.extend(re.findall(r"\b(?:Macau Scam|Love Scam|Lucky Draw|Investment Scheme|Parcel Scam)\b", text, re.I))
    unique: list[str] = []
    for value in found:
        value = value.strip()
        if value and value.lower() not in {item.lower() for item in unique}:
            unique.append(value)
    return unique[:3]


def _is_scam_result(item: dict) -> bool:
    corpus = " ".join(str(item.get(key, "")) for key in ("title", "text", "url")).lower()
    return any(token in corpus for token in ("scam", "fraud", "penipu", "penipuan", "phishing", "impersonat"))


class OSINTAgent:
    async def run(self, **kwargs):
        text = (kwargs.get("text") or "").strip()
        entities = extract_entities(text)
        # A bare image has no reliable entity to investigate without OCR. Do
        # not manufacture the mock LHDN evidence on a real image analysis.
        if kwargs.get("kind") == "image" and (settings.agent_mode_for("osint") != "real" or not settings.exa_api_key):
            return AgentResult(agent="osint", unavailable=True, payload={"claim": "OSINT skipped: no accompanying entity text and no live Exa search configured."})
        if settings.agent_mode_for("osint") != "real" or not settings.exa_api_key:
            return await mock_agents.osint(text=text)
        if not entities:
            return AgentResult(agent="osint", score=0.08, payload={"entities": [], "mentions": 0, "sources": [], "claim": "No named entity was available for a focused live-web scam search."})
        queries = [f'"{entity}" Malaysia scam' for entity in entities]
        batches = await asyncio.gather(*(search(query, num_results=4) for query in queries))
        results = [item for batch in batches for item in batch]
        scam_results = [item for item in results if _is_scam_result(item)]
        mentions = len(scam_results)
        sources = [{"title": item.get("title", "Public web report"), "url": item.get("url", ""), "published_date": item.get("publishedDate")} for item in scam_results[:5]]
        score = min(0.95, 0.12 + mentions * 0.16) if results else 0.08
        return AgentResult(agent="osint", score=round(score, 3), payload={"entities": entities, "queries": queries, "mentions": mentions, "sources": sources, "provider": "exa", "claim": f"Exa found {mentions} scam-related public web report{'s' if mentions != 1 else ''} for {', '.join(entities)}."})
