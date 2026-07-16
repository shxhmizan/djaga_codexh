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
    found.extend(re.findall(r"(?<!\d)\d{8,18}(?!\d)", text.replace(" ", "").replace("-", "")))
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


def _unique_sources(items: list[dict]) -> list[dict]:
    """Keep actual Exa sources distinct before they reach the verdict/UI."""
    seen: set[str] = set()
    sources: list[dict] = []
    for item in items:
        url = str(item.get("url") or "").strip()
        title = str(item.get("title") or "Public web result").strip()
        key = url or title.lower()
        if not key or key in seen:
            continue
        seen.add(key)
        sources.append({"title": title[:240], "url": url, "published_date": item.get("publishedDate")})
    return sources


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
        # Do not put "scam" in every query: doing so makes every returned
        # result look like a scam hit and turns Exa's result limit into a fake
        # evidence count. Search the entity first, then classify the returned
        # source content independently.
        queries = [query for entity in entities for query in (f'"{entity}" Malaysia', f'"{entity}" scam Malaysia')]
        batches = await asyncio.gather(*(search(query, num_results=6) for query in queries))
        results = [item for batch in batches for item in batch]
        scam_results = [item for item in results if _is_scam_result(item)]
        sources = _unique_sources(scam_results)[:5]
        all_sources = _unique_sources(results)[:5]
        score = min(0.78, 0.18 + len(sources) * 0.12) if sources else 0.08
        if sources:
            examples = "; ".join(f'“{source["title"]}”' for source in sources[:2])
            claim = f"Exa searched live public sources for {', '.join(entities)}. Relevant sources include {examples}."
        elif all_sources:
            examples = "; ".join(f'“{source["title"]}”' for source in all_sources[:2])
            claim = f"Exa searched live public sources for {', '.join(entities)} but found no scam-language match. Reviewed: {examples}."
        else:
            claim = f"Exa searched live public sources for {', '.join(entities)} but returned no usable sources."
        return AgentResult(agent="osint", score=round(score, 3), payload={"entities": entities, "queries": queries, "scam_source_count": len(sources), "sources": sources or all_sources, "provider": "exa", "claim": claim})
