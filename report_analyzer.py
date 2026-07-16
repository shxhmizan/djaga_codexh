"""Safe analysis for community scam reports.

Mock mode is deterministic for local use. A real model can replace this function
without changing the report API or database shape.
"""
from __future__ import annotations

import re
from typing import Any

TYPE_RULES = {
    "macau_scam": ("Fake authority / Macau scam", ("pdrm", "police", "polis", "officer", "court", "drug case", "arrest", "lhdn")),
    "deepfake": ("Suspected cloned voice or deepfake", ("deepfake", "cloned voice", "voice clone", "ai voice", "video call")),
    "phishing": ("Phishing link or account takeover attempt", ("link", "url", "click", "tac", "otp", "verify", "login", "password")),
    "investment_scam": ("High-return investment scam", ("investment", "crypto", "profit", "return", "trading", "pelaburan")),
    "love_scam": ("Romance scam payment request", ("romance", "dating", "boyfriend", "girlfriend", "relationship", "love")),
    "job_scam": ("Fake job or task scam", ("job", "work from home", "salary", "task", "registration fee", "parcel")),
    "parcel_scam": ("Parcel or delivery fee scam", ("parcel", "delivery", "pos malaysia", "customs", "courier")),
}


def _redact(text: str) -> str:
    text = re.sub(r"\b\d{4,}\b", "[redacted number]", text)
    text = re.sub(r"https?://\S+|\b\S+\.(?:com|my|net|org)\S*", "[redacted link]", text, flags=re.I)
    return " ".join(text.split())[:360]


def analyze_report(description: str, submitted_type: str | None = None, phone_link: str | None = None) -> dict[str, Any]:
    text = " ".join(filter(None, (description, phone_link))).lower()
    scores = {kind: sum(token in text for token in tokens) for kind, (_, tokens) in TYPE_RULES.items()}
    selected = max(scores, key=scores.get)
    if scores[selected] == 0 and submitted_type in TYPE_RULES:
        selected = submitted_type
    if scores[selected] == 0:
        selected = "phishing" if phone_link and ("http" in phone_link or "." in phone_link) else "other"
    title = TYPE_RULES.get(selected, ("Suspicious scam report", ()))[0]
    confidence = min(0.97, 0.60 + scores.get(selected, 0) * 0.10)
    if selected == "other":
        confidence = 0.52
    entities = []
    for number in re.findall(r"(?:\+?60|0)\d[\d\s-]{7,}", f"{description} {phone_link or ''}"):
        entities.append({"kind": "phone", "value": number.strip()})
    for url in re.findall(r"(?:https?://)?[\w.-]+\.(?:com|my|net|org)\S*", f"{description} {phone_link or ''}", flags=re.I):
        entities.append({"kind": "link", "value": url})
    return {
        "type": selected,
        "title": title,
        "summary": _redact(description),
        "confidence": round(confidence, 2),
        "entities": entities,
        "mode": "mock",
    }


def coordinates_for(location: str | None) -> tuple[float, float, str]:
    locations = {
        "kuala lumpur": (3.1390, 101.6869, "Kuala Lumpur"), "selangor": (3.0738, 101.5183, "Selangor"),
        "ipoh": (4.5975, 101.0901, "Ipoh"), "penang": (5.4164, 100.3327, "Penang"),
        "johor": (1.4927, 103.7414, "Johor"), "sabah": (5.9804, 116.0735, "Sabah"),
        "sarawak": (1.5497, 110.3592, "Sarawak"),
    }
    value = (location or "").lower()
    for key, point in locations.items():
        if key in value:
            return point
    return 4.2105, 108.9758, "Malaysia"
