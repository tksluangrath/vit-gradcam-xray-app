"""
Unit tests for utils/image_utils.py — validate_and_resize().
"""

import io
import os
import sys

import pytest
from fastapi import HTTPException
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.image_utils import validate_and_resize  # noqa: E402


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), color=(128, 64, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png_bytes(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), color=(10, 200, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_gif_bytes() -> bytes:
    img = Image.new("P", (50, 50))
    buf = io.BytesIO()
    img.save(buf, format="GIF")
    return buf.getvalue()


class TestValidateAndResizeHappyPath:

    def test_valid_jpeg_returns_pil_image(self):
        result = validate_and_resize(_make_jpeg_bytes())
        assert isinstance(result, Image.Image)

    def test_valid_jpeg_resized_to_224(self):
        result = validate_and_resize(_make_jpeg_bytes(width=640, height=480))
        assert result.size == (224, 224)

    def test_valid_png_returns_pil_image(self):
        result = validate_and_resize(_make_png_bytes())
        assert isinstance(result, Image.Image)

    def test_valid_png_resized_to_224(self):
        result = validate_and_resize(_make_png_bytes(width=300, height=300))
        assert result.size == (224, 224)

    def test_already_224x224_jpeg_unchanged_size(self):
        result = validate_and_resize(_make_jpeg_bytes(width=224, height=224))
        assert result.size == (224, 224)

    def test_large_jpeg_1000x800_resized_to_224(self):
        result = validate_and_resize(_make_jpeg_bytes(width=1000, height=800))
        assert result.size == (224, 224)

    def test_jpeg_output_mode_is_rgb(self):
        result = validate_and_resize(_make_jpeg_bytes())
        assert result.mode == "RGB"

    def test_png_output_mode_is_rgb(self):
        result = validate_and_resize(_make_png_bytes())
        assert result.mode == "RGB"

    def test_small_jpeg_1x1_resized_to_224(self):
        result = validate_and_resize(_make_jpeg_bytes(width=1, height=1))
        assert result.size == (224, 224)

    def test_returns_image_object_not_bytes(self):
        result = validate_and_resize(_make_png_bytes())
        assert not isinstance(result, (bytes, bytearray))


class TestValidateAndResizeUnsupportedFormats:

    def test_gif_raises_http_exception(self):
        with pytest.raises(HTTPException):
            validate_and_resize(_make_gif_bytes())

    def test_gif_raises_status_400(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(_make_gif_bytes())
        assert exc_info.value.status_code == 400

    def test_gif_error_detail_mentions_format(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(_make_gif_bytes())
        detail = exc_info.value.detail
        assert "GIF" in detail or "Unsupported" in detail

    def test_random_garbage_bytes_raises_http_exception(self):
        garbage = b"\x00\x01\x02\x03\xff\xfe\xfd" * 50
        with pytest.raises(HTTPException):
            validate_and_resize(garbage)

    def test_random_garbage_bytes_raises_status_400(self):
        garbage = b"\x00\x01\x02\x03\xff\xfe\xfd" * 50
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(garbage)
        assert exc_info.value.status_code == 400

    def test_empty_bytes_raises_status_400(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(b"")
        assert exc_info.value.status_code == 400

    def test_truncated_jpeg_header_raises_status_400(self):
        partial = b"\xff\xd8\xff"
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(partial)
        assert exc_info.value.status_code == 400

    def test_plain_text_bytes_raise_status_400(self):
        text_bytes = b"This is definitely not an image.\n" * 10
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(text_bytes)
        assert exc_info.value.status_code == 400

    def test_exception_detail_is_string(self):
        with pytest.raises(HTTPException) as exc_info:
            validate_and_resize(_make_gif_bytes())
        assert isinstance(exc_info.value.detail, str)
        assert len(exc_info.value.detail) > 0
