"""Deterministic input validation and routing for every real DJAGA check."""
from __future__ import annotations

from contracts import AgentResult


class IntakeAgent:
    async def run(self, **kwargs) -> AgentResult:
        kind = str(kwargs.get("kind") or "message")
        blob = kwargs.get("blob")
        text = str(kwargs.get("text") or "").strip()
        content_type = str(kwargs.get("content_type") or "")

        if kind in {"voice", "call"}:
            if not blob:
                return AgentResult(agent="intake", unavailable=True, payload={"claim": "No audio was received for this voice check."})
            size = len(blob)
            return AgentResult(
                agent="intake",
                payload={
                    "kind": kind,
                    "bytes_received": size,
                    "content_type": content_type or "audio/unknown",
                    "claim": f"Validated {size:,} bytes of {content_type or 'audio'} for the voice investigation.",
                },
            )

        if kind == "image":
            if not blob:
                return AgentResult(agent="intake", unavailable=True, payload={"claim": "No image was received for this image check."})
            size = len(blob)
            return AgentResult(
                agent="intake",
                payload={
                    "kind": "image",
                    "bytes_received": size,
                    "content_type": content_type or "image/unknown",
                    "claim": f"Validated uploaded {content_type or 'image'} ({size:,} bytes) for local authenticity analysis.",
                },
            )

        if not text:
            return AgentResult(agent="intake", unavailable=True, payload={"claim": "No readable message text was supplied for this check."})
        return AgentResult(
            agent="intake",
            payload={
                "kind": "message",
                "characters_received": len(text),
                "claim": f"Validated {len(text):,} characters of message content for scam analysis.",
            },
        )
