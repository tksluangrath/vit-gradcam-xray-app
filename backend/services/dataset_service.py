from __future__ import annotations

import logging
import os
import random
import time
from typing import Any

from datasets import load_dataset  # type: ignore[import-untyped]
from PIL import Image

from config import settings

logger = logging.getLogger(__name__)

# Module-level cache populated at startup
_gallery_images: list[dict[str, Any]] = []
_dataset_stats: dict[str, Any] = {}


def _get_label_name(item: dict[str, Any], features: Any) -> str:
    """
    Extract canonical label ("NORMAL" or "PNEUMONIA") from a dataset item.

    hf-vision/chest-xray-pneumonia uses a ClassLabel column named "label"
    with values: 0 = NORMAL, 1 = PNEUMONIA.
    """
    raw = item.get("label", item.get("labels", 0))
    label_int = int(raw)

    try:
        name: str = features["label"].int2str(label_int)
        name = name.upper()
    except Exception:
        try:
            name = features["labels"].int2str(label_int).upper()
        except Exception:
            name = "PNEUMONIA" if label_int == 1 else "NORMAL"

    if any(token in name for token in ("PNEUMONIA", "BACTERIA", "VIRUS")):
        return "PNEUMONIA"
    return "NORMAL"


def _load_dataset_with_retry(dataset_name: str, **kwargs: Any) -> Any:
    """Load a HuggingFace dataset with exponential-backoff retries."""
    retries = settings.DOWNLOAD_RETRIES
    delay = settings.DOWNLOAD_RETRY_DELAY
    last_exc: Exception = RuntimeError("Unknown error")
    for attempt in range(1, retries + 1):
        try:
            return load_dataset(dataset_name, **kwargs)
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                logger.warning(
                    "Dataset load attempt %d/%d failed: %s — retrying in %.0fs",
                    attempt, retries, exc, delay,
                )
                time.sleep(delay)
                delay *= 2
            else:
                logger.error("All %d dataset load attempts failed.", retries)
    raise last_exc


def load_and_cache_gallery(cache_dir: str, per_class: int) -> list[dict[str, Any]]:
    """
    Download the chest-xray-pneumonia dataset, sample images, save to disk.
    Returns a list of gallery image metadata dicts.
    """
    global _gallery_images, _dataset_stats

    os.makedirs(cache_dir, exist_ok=True)

    dataset_name = settings.DATASET_NAME
    logger.info("Loading dataset: %s (test split)...", dataset_name)

    # hf-vision/chest-xray-pneumonia uses the "default" config — no name= arg needed
    dataset = _load_dataset_with_retry(dataset_name, split="test")

    features = dataset.features

    # Separate indices by class
    normal_indices: list[int] = []
    pneumonia_indices: list[int] = []

    for i, item in enumerate(dataset):
        label_name = _get_label_name(item, features)
        if label_name == "NORMAL":
            normal_indices.append(i)
        else:
            pneumonia_indices.append(i)

    # Sample reproducibly
    rng = random.Random(42)
    selected_normal = rng.sample(normal_indices, min(per_class, len(normal_indices)))
    selected_pneumonia = rng.sample(pneumonia_indices, min(per_class, len(pneumonia_indices)))
    selected_indices = selected_normal + selected_pneumonia

    gallery: list[dict[str, Any]] = []
    for gallery_index, dataset_index in enumerate(selected_indices):
        item = dataset[dataset_index]
        label_name = _get_label_name(item, features)
        filename = f"{gallery_index:03d}_{label_name}.jpg"
        filepath = os.path.join(cache_dir, filename)

        if not os.path.exists(filepath):
            pil_image: Image.Image = item["image"]
            pil_image = pil_image.convert("RGB")
            pil_image.save(filepath, format="JPEG", quality=90)

        gallery.append(
            {
                "id": f"gallery_{gallery_index:03d}",
                "url": f"/static/gallery/{filename}",
                "label": label_name,
                "index": gallery_index,
            }
        )

    _gallery_images = gallery

    # Collect stats — wrap entirely so a failure here never crashes gallery loading
    stats: dict[str, Any] = {"train_count": 0, "test_count": 0, "validation_count": 0}
    class_dist: dict[str, int] = {"NORMAL": 0, "PNEUMONIA": 0}

    split_map = [
        ("train", "train_count"),
        ("test", "test_count"),
        ("validation", "validation_count"),
    ]
    for split_name, count_key in split_map:
        try:
            split_ds = _load_dataset_with_retry(dataset_name, split=split_name)
            stats[count_key] = len(split_ds)
            if split_name == "train":
                for item in split_ds:
                    lname = _get_label_name(item, split_ds.features)
                    class_dist[lname] += 1
        except Exception as e:
            logger.warning("Could not load split '%s' for stats: %s", split_name, e)

    _dataset_stats = {**stats, "class_distribution": class_dist}
    logger.info("Gallery cached: %d images.", len(gallery))
    return gallery


def get_gallery_images() -> list[dict[str, Any]]:
    return _gallery_images


def get_dataset_stats() -> dict[str, Any]:
    return _dataset_stats
