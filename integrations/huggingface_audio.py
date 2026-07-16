"""Lazy, local audio anti-spoofing inference without ffmpeg."""
from __future__ import annotations

import asyncio
import io
import os
from typing import Any

from config import settings


def _spoof_label(label: str) -> bool:
    value = label.lower()
    return any(word in value for word in ("spoof", "fake", "deepfake", "synthetic", "bonafide_false")) and "bonafide" not in value and "real" not in value


def _classify(blob: bytes) -> dict[str, Any]:
    try:
        os.environ.setdefault("USE_TF", "0")
        import numpy as np
        import soundfile as sf
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
        import torch
    except ImportError as exc:
        raise RuntimeError("Install soundfile, torch, and transformers for audio forensics") from exc
    # soundfile handles WAV/FLAC/OGG through wheels without ffmpeg. An iOS M4A
    # may not be decodable by libsndfile; in that case this signal is marked
    # unavailable while ElevenLabs still receives the untouched original.
    samples, sample_rate = sf.read(io.BytesIO(blob), dtype="float32", always_2d=False)
    if getattr(samples, "ndim", 1) > 1:
        samples = np.mean(samples, axis=1)
    if sample_rate != 16_000:
        target_length = max(1, round(len(samples) * 16_000 / sample_rate))
        samples = np.interp(np.linspace(0, len(samples) - 1, target_length), np.arange(len(samples)), samples).astype("float32")
        sample_rate = 16_000
    if samples.size < 1600:
        raise RuntimeError("Audio is too short for anti-spoofing analysis")
    extractor = AutoFeatureExtractor.from_pretrained(settings.voice_model_id, token=settings.hf_token or None)
    model = AutoModelForAudioClassification.from_pretrained(settings.voice_model_id, token=settings.hf_token or None)
    labels = {int(key): value for key, value in model.config.id2label.items()}
    segment_size = sample_rate * 4
    scores: list[float] = []
    labels_seen: list[str] = []
    for offset in range(0, len(samples), segment_size):
        segment = samples[offset:offset + segment_size]
        if len(segment) < sample_rate:
            continue
        inputs = extractor(segment, sampling_rate=sample_rate, return_tensors="pt", padding=True)
        with torch.no_grad():
            probabilities = torch.softmax(model(**inputs).logits, dim=-1)[0].tolist()
        ranked = sorted(enumerate(probabilities), key=lambda pair: pair[1], reverse=True)
        spoof = sum(score for index, score in enumerate(probabilities) if _spoof_label(labels.get(index, str(index))))
        score = spoof if spoof else ranked[0][1]
        scores.append(float(score))
        labels_seen.append(str(labels.get(ranked[0][0], ranked[0][0])))
    if not scores:
        raise RuntimeError("No usable audio segment was found")
    return {"score": float(np.mean(scores)), "segment_scores": [round(score, 3) for score in scores], "top_labels": labels_seen, "model": settings.voice_model_id}


async def classify_audio(blob: bytes) -> dict[str, Any]:
    if not blob:
        raise RuntimeError("No audio bytes were supplied")
    return await asyncio.to_thread(_classify, blob)
