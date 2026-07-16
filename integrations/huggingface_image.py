"""Lazy local Hugging Face image-authenticity inference."""
from __future__ import annotations

import asyncio
import io
import os
from typing import Any

from config import settings


def _is_synthetic(label: str) -> bool:
    value = label.lower()
    return any(word in value for word in ("fake", "deepfake", "ai", "generated", "synthetic", "manipulated")) and not any(word in value for word in ("real", "authentic", "human"))


def _classify(blob: bytes) -> dict[str, Any]:
    try:
        # This project uses PyTorch only. Explicitly disable an unrelated local
        # TensorFlow install, which otherwise can be imported by Transformers
        # image utilities before the model is even loaded.
        os.environ.setdefault("USE_TF", "0")
        from PIL import Image
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        import torch
    except ImportError as exc:
        raise RuntimeError("Install Pillow, torch, and transformers for image forensics") from exc
    image = Image.open(io.BytesIO(blob)).convert("RGB")
    processor = AutoImageProcessor.from_pretrained(settings.image_model_id, token=settings.hf_token or None)
    model = AutoModelForImageClassification.from_pretrained(settings.image_model_id, token=settings.hf_token or None)
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        probabilities = torch.softmax(model(**inputs).logits, dim=-1)[0].tolist()
    labels = {int(key): value for key, value in model.config.id2label.items()}
    ranked = sorted(
        ({"label": labels.get(index, str(index)), "score": float(score)} for index, score in enumerate(probabilities)),
        key=lambda value: value["score"], reverse=True,
    )
    synthetic = sum(item["score"] for item in ranked if _is_synthetic(item["label"]))
    # Some model cards use labels like "0"/"1". In that case use the top
    # posterior, while retaining the raw labels in the evidence for review.
    score = synthetic if synthetic else ranked[0]["score"]
    return {"score": max(0.0, min(1.0, score)), "predictions": ranked[:3], "size": list(image.size), "model": settings.image_model_id}


async def classify_image(blob: bytes) -> dict[str, Any]:
    if not blob:
        raise RuntimeError("No image bytes were supplied")
    return await asyncio.to_thread(_classify, blob)
