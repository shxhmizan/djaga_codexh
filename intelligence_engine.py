"""Source-cited modus-operandi generation from persisted scam feed records."""
from __future__ import annotations

import hashlib
import json
import time
from collections import defaultdict
from typing import Any
from urllib.parse import urlparse

import httpx

from config import settings
from db import get_feed, get_intelligence, replace_intelligence

INSIGHT_KIND = "modus_operandi"
META_KIND = "modus_operandi_meta"
_SEVERITIES = {"critical", "high", "medium", "low"}
_TRENDS = {"rising", "stable", "falling"}


def _fingerprint(records: list[dict[str, Any]]) -> str:
    relevant = [{key: row.get(key) for key in ("title", "summary", "scam_type", "region", "source_url", "date")} for row in records]
    return hashlib.sha256(("public-reference-v2:" + json.dumps(relevant, sort_keys=True)).encode()).hexdigest()


def _is_public_reference(row: dict[str, Any]) -> bool:
    parsed = urlparse(str(row.get("source_url") or ""))
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc) and not parsed.netloc.endswith(".local")


def _source_records(rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    sources: list[dict[str, str]] = []
    for row in rows:
        url = str(row.get("source_url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        sources.append({
            "title": str(row.get("title") or "Scam feed record")[:220],
            "url": url,
            "publisher": str(row.get("source_name") or "DJAGA intelligence")[:100],
            "date": str(row.get("date") or ""),
        })
    return sources


def _fallback(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Honest zero-key fallback derived only from persisted feed records."""
    public_records = [row for row in records if _is_public_reference(row)]
    records = public_records or records
    by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in records:
        by_type[str(row.get("scam_type") or "Other")].append(row)
    insights: list[dict[str, Any]] = []
    for index, (scam_type, rows) in enumerate(sorted(by_type.items(), key=lambda item: len(item[1]), reverse=True)[:3], 1):
        sources = _source_records(rows)
        regions = list(dict.fromkeys(str(row.get("region") or "Malaysia") for row in rows))
        sample = rows[0]
        severity = "critical" if len(rows) >= 4 else "high" if len(rows) >= 2 else "medium"
        insights.append({
            "id": f"modus-{index}", "title": f"{scam_type} pattern in {' · '.join(regions[:2])}",
            "body": f"DJAGA grouped {len(rows)} feed records with a similar {scam_type.lower()} pattern. Latest signal: {sample.get('summary', '')}",
            "severity": severity, "confidence": min(88, 55 + len(rows) * 7),
            "affectedArea": " · ".join(regions[:2]), "evidenceCount": len(sources), "evidenceLabel": "source records",
            "trend": "rising" if len(rows) > 1 else "stable", "tags": [scam_type.lower().replace(" ", "-"), *[region.lower().replace(" ", "-") for region in regions[:2]]],
            "recommendation": "Pause before paying or sharing codes. Verify through an independently found official contact.",
            "sources": sources, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "engine": "feed-derived",
        })
    return insights


async def _interpret_with_openrouter(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    public_records = [row for row in records if _is_public_reference(row)]
    if not public_records:
        raise RuntimeError("No externally reachable feed references are available")
    source_map = {str(row["source_url"]): row for row in public_records}
    compact = [
        {"title": row.get("title"), "summary": row.get("summary"), "type": row.get("scam_type"), "region": row.get("region"), "date": row.get("date"), "source_url": row.get("source_url")}
        for row in public_records[:60]
    ]
    system = """You are DJAGA's Malaysian scam-intelligence analyst. Create 1 to 3 concise modus-operandi alerts from the supplied scam feed records. Return JSON only: {\"insights\":[{\"title\":str,\"body\":str,\"severity\":\"critical|high|medium|low\",\"confidence\":0-100,\"affected_area\":str,\"trend\":\"rising|stable|falling\",\"tags\":[str],\"recommendation\":str,\"source_urls\":[str]}]}. Every claim must be supported by the supplied records. source_urls must be exact URLs from the input, with 1 to 4 per insight. Never invent victim counts, sources, dates, or official confirmation."""
    headers = {"Authorization": f"Bearer {settings.openrouter_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions", headers=headers,
            json={"model": settings.openrouter_model, "temperature": 0.15, "response_format": {"type": "json_object"}, "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps({"scam_feed": compact}, ensure_ascii=False)},
            ]},
        )
        response.raise_for_status()
        data = response.json()
    content = data["choices"][0]["message"]["content"]
    if isinstance(content, str):
        content = json.loads(content.strip().removeprefix("```json").removesuffix("```").strip())
    raw = content.get("insights", []) if isinstance(content, dict) else []
    if not isinstance(raw, list):
        raise RuntimeError("OpenRouter returned an invalid intelligence response")
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    insights: list[dict[str, Any]] = []
    for index, item in enumerate(raw[:3], 1):
        if not isinstance(item, dict):
            continue
        urls = [str(url) for url in item.get("source_urls", []) if str(url) in source_map][:4]
        sources = _source_records([source_map[url] for url in urls])
        if not sources:
            continue
        severity = str(item.get("severity", "medium")).lower()
        trend = str(item.get("trend", "stable")).lower()
        try:
            confidence = max(35, min(95, int(float(item.get("confidence", 60)))))
        except (TypeError, ValueError):
            confidence = 60
        tags = [str(tag).strip().lower().replace("#", "")[:32] for tag in item.get("tags", []) if str(tag).strip()][:5]
        insights.append({
            "id": f"modus-{index}", "title": str(item.get("title") or "Emerging scam pattern")[:120],
            "body": str(item.get("body") or "DJAGA identified a pattern across recent scam-feed records.")[:700],
            "severity": severity if severity in _SEVERITIES else "medium", "confidence": confidence,
            "affectedArea": str(item.get("affected_area") or source_map[urls[0]].get("region") or "Malaysia")[:100],
            "evidenceCount": len(sources), "evidenceLabel": "source records", "trend": trend if trend in _TRENDS else "stable",
            "tags": tags or [str(source_map[urls[0]].get("scam_type") or "scam").lower().replace(" ", "-")],
            "recommendation": str(item.get("recommendation") or "Pause and verify independently before sending money or sharing codes.")[:400],
            "sources": sources, "generatedAt": now, "engine": "openrouter",
        })
    if not insights:
        raise RuntimeError("OpenRouter returned no source-cited insights")
    return insights


async def refresh_modus_operandi(force: bool = False) -> dict[str, Any]:
    records = get_feed(limit=80)
    if not records:
        return {"generated": 0, "engine": "none", "changed": False}
    fingerprint = _fingerprint(records)
    meta = get_intelligence(META_KIND)
    existing = get_intelligence(INSIGHT_KIND)
    if not force and existing and meta and meta[0].get("fingerprint") == fingerprint:
        return {"generated": len(existing), "engine": existing[0].get("engine", "stored"), "changed": False}
    try:
        insights = await _interpret_with_openrouter(records)
        engine = "openrouter"
    except Exception:
        insights = _fallback(records)
        engine = "feed-derived"
    replace_intelligence(INSIGHT_KIND, insights)
    replace_intelligence(META_KIND, [{"id": "current", "fingerprint": fingerprint, "generatedAt": insights[0]["generatedAt"], "engine": engine}])
    return {"generated": len(insights), "engine": engine, "changed": True}
