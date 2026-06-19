from __future__ import annotations

import logging
import time
from typing import Optional

import torch
from PIL import Image
from transformers import ViTForImageClassification, ViTImageProcessor

from config import settings

logger = logging.getLogger(__name__)

_model: Optional[ViTForImageClassification] = None
_processor: Optional[ViTImageProcessor] = None


def load_model(model_id: str) -> None:
    """Load the ViT model and image processor from HuggingFace Hub, with retries."""
    global _model, _processor

    retries = settings.DOWNLOAD_RETRIES
    delay = settings.DOWNLOAD_RETRY_DELAY
    last_exc: Exception = RuntimeError("Unknown error")

    for attempt in range(1, retries + 1):
        try:
            logger.info("Loading ViT model: %s (attempt %d/%d)", model_id, attempt, retries)
            _processor = ViTImageProcessor.from_pretrained(model_id)
            _model = ViTForImageClassification.from_pretrained(model_id)
            _model.eval()
            logger.info("Model loaded successfully.")
            return
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                logger.warning(
                    "Model load attempt %d/%d failed: %s — retrying in %.0fs",
                    attempt, retries, exc, delay,
                )
                time.sleep(delay)
                delay *= 2
            else:
                logger.error("All %d model load attempts failed.", retries)

    raise last_exc


def is_loaded() -> bool:
    return _model is not None and _processor is not None


def get_model() -> ViTForImageClassification:
    if _model is None:
        raise RuntimeError("Model is not loaded. Call load_model() first.")
    return _model


def get_processor() -> ViTImageProcessor:
    if _processor is None:
        raise RuntimeError("Processor is not loaded. Call load_model() first.")
    return _processor


def predict(pil_image: Image.Image) -> tuple[str, float]:
    """
    Run inference on a PIL image.

    Returns:
        (label, confidence) where label is "NORMAL" or "PNEUMONIA"
        and confidence is the softmax probability of the predicted class.
    """
    model = get_model()
    processor = get_processor()

    inputs = processor(images=pil_image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits
    probs = torch.softmax(logits, dim=-1)
    predicted_idx = int(torch.argmax(probs, dim=-1).item())
    confidence = float(probs[0, predicted_idx].item())

    # Normalize label to uppercase NORMAL / PNEUMONIA
    raw_label: str = model.config.id2label[predicted_idx]
    label = raw_label.upper().replace("-", "_")

    # Map common label variants to canonical names
    if "PNEUMONIA" in label or "BACTERIA" in label or "VIRUS" in label:
        label = "PNEUMONIA"
    else:
        label = "NORMAL"

    return label, confidence
