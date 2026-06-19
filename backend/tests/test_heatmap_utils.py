"""
Unit tests for utils/heatmap_utils.py — overlay_heatmap().
"""

import base64
import io
import os
import sys

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.heatmap_utils import overlay_heatmap  # noqa: E402


def _make_rgb_image(width: int = 224, height: int = 224) -> Image.Image:
    return Image.new("RGB", (width, height), color=(120, 80, 200))


def _make_zeros_mask() -> np.ndarray:
    return np.zeros((224, 224), dtype=np.float32)


def _make_ones_mask() -> np.ndarray:
    return np.ones((224, 224), dtype=np.float32)


def _make_random_mask(seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.uniform(0.0, 1.0, (224, 224)).astype(np.float32)


def _decode_data_uri_to_pil(data_uri: str) -> Image.Image:
    prefix = "data:image/png;base64,"
    b64_data = data_uri[len(prefix):]
    raw_bytes = base64.b64decode(b64_data)
    return Image.open(io.BytesIO(raw_bytes))


class TestOverlayHeatmapReturnFormat:

    def test_returns_string(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        assert isinstance(result, str)

    def test_starts_with_data_uri_prefix(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        assert result.startswith("data:image/png;base64,")

    def test_base64_payload_is_nonempty(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        payload = result[len("data:image/png;base64,"):]
        assert len(payload) > 0

    def test_base64_payload_is_decodable(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        payload = result[len("data:image/png;base64,"):]
        decoded = base64.b64decode(payload)
        assert len(decoded) > 0

    def test_output_is_valid_png(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.format == "PNG"

    def test_output_png_dimensions_are_224x224(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.size == (224, 224)

    def test_output_png_mode_is_rgb(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.mode == "RGB"


class TestOverlayHeatmapEdgeCases:

    def test_all_zeros_mask_does_not_crash(self):
        result = overlay_heatmap(_make_rgb_image(), _make_zeros_mask())
        assert isinstance(result, str)

    def test_all_zeros_mask_returns_valid_data_uri(self):
        result = overlay_heatmap(_make_rgb_image(), _make_zeros_mask())
        assert result.startswith("data:image/png;base64,")

    def test_all_zeros_mask_output_is_valid_png(self):
        result = overlay_heatmap(_make_rgb_image(), _make_zeros_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.format == "PNG"

    def test_all_ones_mask_does_not_crash(self):
        result = overlay_heatmap(_make_rgb_image(), _make_ones_mask())
        assert isinstance(result, str)

    def test_all_ones_mask_returns_valid_data_uri(self):
        result = overlay_heatmap(_make_rgb_image(), _make_ones_mask())
        assert result.startswith("data:image/png;base64,")

    def test_all_ones_mask_output_is_valid_png(self):
        result = overlay_heatmap(_make_rgb_image(), _make_ones_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.format == "PNG"

    def test_random_mask_returns_valid_data_uri(self):
        result = overlay_heatmap(_make_rgb_image(), _make_random_mask(seed=42))
        assert result.startswith("data:image/png;base64,")

    def test_zeros_and_ones_produce_different_outputs(self):
        r_zeros = overlay_heatmap(_make_rgb_image(), _make_zeros_mask())
        r_ones = overlay_heatmap(_make_rgb_image(), _make_ones_mask())
        assert r_zeros != r_ones

    def test_rgba_input_image_handled_without_crash(self):
        rgba_image = Image.new("RGBA", (224, 224), color=(100, 150, 200, 128))
        result = overlay_heatmap(rgba_image, _make_random_mask())
        assert result.startswith("data:image/png;base64,")

    def test_rgba_input_output_is_valid_png(self):
        rgba_image = Image.new("RGBA", (224, 224), color=(100, 150, 200, 128))
        result = overlay_heatmap(rgba_image, _make_random_mask())
        pil = _decode_data_uri_to_pil(result)
        assert pil.format == "PNG"

    def test_different_seeds_produce_different_outputs(self):
        r1 = overlay_heatmap(_make_rgb_image(), _make_random_mask(seed=1))
        r2 = overlay_heatmap(_make_rgb_image(), _make_random_mask(seed=2))
        assert r1 != r2
