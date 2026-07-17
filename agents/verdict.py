"""Evidence-cited, deterministic risk fusion for a completed investigation."""
from __future__ import annotations

import re

from config import settings
from contracts import AgentResult, Verdict


class VerdictAgent:
    def compose(self, *, kind: str, results: dict[str, AgentResult], text: str | None = None) -> Verdict:
        weights = (
            settings.audio_weights if kind in {"call", "voice"}
            else settings.text_weights if kind == "message"
            else settings.image_weights
        )
        available = {
            name: result for name, result in results.items()
            if name in weights and result.score is not None and not result.unavailable
        }
        total_weight = sum(weights[name] for name in available) or 1.0
        risk = sum((weights[name] / total_weight) * float(result.score) for name, result in available.items())
        level = "danger" if risk >= settings.danger_threshold else "caution" if risk >= settings.caution_threshold else "safe"
        evidence = [
            {
                "agent": name,
                "claim": result.payload.get("claim", f"{name.replace('_', ' ').title()} signal."),
                "weight_contribution": round((weights[name] / total_weight) * float(result.score), 3),
                "score": result.score,
                "mock": bool(result.payload.get("mock", False)),
            }
            for name, result in available.items()
        ]
        transcript = results.get("transcribe", AgentResult(agent="transcribe")).payload.get("transcript") or text
        return Verdict(
            risk=round(risk, 3),
            level=level,
            kind=kind,
            evidence=evidence,
            excerpt=transcript,
            flagged_phrases=self._flagged_phrases(transcript or ""),
        )

    async def run(self, **kwargs) -> AgentResult:
        verdict = self.compose(
            kind=str(kwargs.get("kind") or "message"),
            results=kwargs.get("results") or {},
            text=kwargs.get("text"),
        )
        claim = (
            f"Fused {len(verdict.evidence)} available investigation signals into a {verdict.level} verdict "
            f"at {verdict.risk:.0%} risk."
        )
        return AgentResult(agent="verdict", score=verdict.risk, payload={"verdict": verdict.model_dump(), "claim": claim})

    @staticmethod
    def _flagged_phrases(text: str) -> list[str]:
        patterns = (
            r"do not tell (?:anyone|anybody)",
            r"(?:transfer|send|pay)\s+(?:rm\s*)?[\d,]+",
            r"(?:tac|otp|verification)\s*(?:code|number)?",
            r"(?:account|bank)\s+(?:is\s+)?frozen",
            r"act now|immediately|urgent",
        )
        found: list[str] = []
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                found.append(match.group(0))
        return found[:5]
