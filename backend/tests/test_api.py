"""
Integration tests for the FastAPI application (main.py).

All ML services (model loading, dataset download, inference, GradCAM) are
patched so tests run with zero network or GPU usage.
"""

from __future__ import annotations

import importlib
import io
import os
import sys
from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import numpy as np
import pytest
import pytest_asyncio
from PIL import Image

_BACKEND_ROOT = os.path.join(os.path.dirname(__file__), "..")
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

# Patch targets (module where name is *used*, per unittest.mock rules)
_LIFESPAN_DATASET_LOAD = "services.dataset_service.load_and_cache_gallery"
_LIFESPAN_MODEL_LOAD   = "services.model_service.load_model"
_ROUTE_PREDICT         = "services.model_service.predict"
_ROUTE_GET_MODEL       = "services.model_service.get_model"
_ROUTE_GET_PROCESSOR   = "services.model_service.get_processor"
_ROUTE_GRADCAM         = "services.gradcam_service.generate_heatmap"
_ROUTE_OVERLAY         = "utils.heatmap_utils.overlay_heatmap"
_ROUTE_GALLERY_IMAGES  = "services.dataset_service.get_gallery_images"
_ROUTE_DATASET_STATS   = "services.dataset_service.get_dataset_stats"
_STATIC_FILES          = "fastapi.staticfiles.StaticFiles"

_FAKE_HEATMAP = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQ"
    "VR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _jpeg_bytes(width: int = 64, height: int = 64) -> bytes:
    img = Image.new("RGB", (width, height), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _gif_bytes() -> bytes:
    img = Image.new("P", (32, 32))
    buf = io.BytesIO()
    img.save(buf, format="GIF")
    return buf.getvalue()


def _gallery_stub() -> list[dict[str, Any]]:
    return [
        {"id": "gallery_000", "url": "/static/gallery/000_NORMAL.jpg", "label": "NORMAL", "index": 0},
        {"id": "gallery_001", "url": "/static/gallery/001_PNEUMONIA.jpg", "label": "PNEUMONIA", "index": 1},
    ]


def _stats_stub() -> dict[str, Any]:
    return {
        "train_count": 5216,
        "test_count": 624,
        "validation_count": 16,
        "class_distribution": {"NORMAL": 1341, "PNEUMONIA": 3875},
    }


@pytest.fixture
def app():
    static_mock = MagicMock(return_value=MagicMock())
    with (
        patch(_LIFESPAN_DATASET_LOAD, return_value=[]),
        patch(_LIFESPAN_MODEL_LOAD, return_value=None),
        patch(_STATIC_FILES, static_mock),
    ):
        import main as main_module
        importlib.reload(main_module)
        yield main_module.app


@pytest_asyncio.fixture
async def client(app):
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac


def _classify_patches(
    label: str = "NORMAL",
    confidence: float = 0.97,
    heatmap: str = _FAKE_HEATMAP,
):
    zeros = np.zeros((224, 224), dtype=np.float32)
    return (
        patch(_ROUTE_PREDICT, return_value=(label, confidence)),
        patch(_ROUTE_GET_MODEL, return_value=MagicMock()),
        patch(_ROUTE_GET_PROCESSOR, return_value=MagicMock()),
        patch(_ROUTE_GRADCAM, return_value=zeros),
        patch(_ROUTE_OVERLAY, return_value=heatmap),
    )


class TestHealthEndpoint:

    async def test_returns_200(self, client: httpx.AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200

    async def test_body_is_status_ok(self, client: httpx.AsyncClient):
        response = await client.get("/health")
        assert response.json() == {"status": "ok"}

    async def test_content_type_is_json(self, client: httpx.AsyncClient):
        response = await client.get("/health")
        assert "application/json" in response.headers["content-type"]


class TestImagesEndpoint:

    async def test_returns_200(self, client: httpx.AsyncClient):
        with patch(_ROUTE_GALLERY_IMAGES, return_value=_gallery_stub()):
            response = await client.get("/images")
        assert response.status_code == 200

    async def test_response_has_images_key(self, client: httpx.AsyncClient):
        with patch(_ROUTE_GALLERY_IMAGES, return_value=_gallery_stub()):
            response = await client.get("/images")
        assert "images" in response.json()

    async def test_response_has_total_key(self, client: httpx.AsyncClient):
        with patch(_ROUTE_GALLERY_IMAGES, return_value=_gallery_stub()):
            response = await client.get("/images")
        assert "total" in response.json()

    async def test_total_matches_images_length(self, client: httpx.AsyncClient):
        stub = _gallery_stub()
        with patch(_ROUTE_GALLERY_IMAGES, return_value=stub):
            response = await client.get("/images")
        data = response.json()
        assert data["total"] == len(data["images"])

    async def test_each_image_has_required_fields(self, client: httpx.AsyncClient):
        with patch(_ROUTE_GALLERY_IMAGES, return_value=_gallery_stub()):
            response = await client.get("/images")
        for item in response.json()["images"]:
            for field in ("id", "url", "label", "index"):
                assert field in item

    async def test_empty_gallery_returns_total_zero(self, client: httpx.AsyncClient):
        with patch(_ROUTE_GALLERY_IMAGES, return_value=[]):
            response = await client.get("/images")
        data = response.json()
        assert data["total"] == 0
        assert data["images"] == []


class TestDatasetInfoEndpoint:

    async def test_returns_200(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value=_stats_stub()):
            response = await client.get("/dataset-info")
        assert response.status_code == 200

    async def test_has_all_required_fields(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value=_stats_stub()):
            response = await client.get("/dataset-info")
        data = response.json()
        for field in ("name", "hf_url", "train_count", "test_count", "validation_count", "class_distribution"):
            assert field in data

    async def test_class_distribution_has_both_classes(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value=_stats_stub()):
            response = await client.get("/dataset-info")
        dist = response.json()["class_distribution"]
        assert "NORMAL" in dist
        assert "PNEUMONIA" in dist

    async def test_counts_are_ints(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value=_stats_stub()):
            response = await client.get("/dataset-info")
        data = response.json()
        assert isinstance(data["train_count"], int)
        assert isinstance(data["test_count"], int)
        assert isinstance(data["validation_count"], int)

    async def test_train_count_matches_stub(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value=_stats_stub()):
            response = await client.get("/dataset-info")
        assert response.json()["train_count"] == 5216

    async def test_empty_stats_returns_zeros(self, client: httpx.AsyncClient):
        with patch(_ROUTE_DATASET_STATS, return_value={}):
            response = await client.get("/dataset-info")
        assert response.status_code == 200
        data = response.json()
        assert data["train_count"] == 0
        assert data["test_count"] == 0


class TestClassifySuccess:

    async def _classify(
        self,
        client: httpx.AsyncClient,
        label: str = "NORMAL",
        confidence: float = 0.97,
        heatmap: str = _FAKE_HEATMAP,
    ) -> httpx.Response:
        patches = _classify_patches(label=label, confidence=confidence, heatmap=heatmap)
        with patches[0], patches[1], patches[2], patches[3], patches[4]:
            return await client.post(
                "/classify",
                files={"file": ("chest.jpg", _jpeg_bytes(), "image/jpeg")},
            )

    async def test_returns_200(self, client: httpx.AsyncClient):
        response = await self._classify(client)
        assert response.status_code == 200

    async def test_response_has_all_fields(self, client: httpx.AsyncClient):
        response = await self._classify(client)
        data = response.json()
        for field in ("label", "confidence", "heatmap_b64", "model_metadata"):
            assert field in data

    async def test_model_metadata_has_all_fields(self, client: httpx.AsyncClient):
        response = await self._classify(client)
        meta = response.json()["model_metadata"]
        for field in ("model_id", "dataset", "version", "framework"):
            assert field in meta

    async def test_label_is_string(self, client: httpx.AsyncClient):
        response = await self._classify(client)
        assert isinstance(response.json()["label"], str)

    async def test_confidence_is_float(self, client: httpx.AsyncClient):
        response = await self._classify(client)
        assert isinstance(response.json()["confidence"], float)

    async def test_label_normal_returned(self, client: httpx.AsyncClient):
        response = await self._classify(client, label="NORMAL")
        assert response.json()["label"] == "NORMAL"

    async def test_label_pneumonia_returned(self, client: httpx.AsyncClient):
        response = await self._classify(client, label="PNEUMONIA", confidence=0.88)
        assert response.json()["label"] == "PNEUMONIA"

    async def test_confidence_value_matches_mock(self, client: httpx.AsyncClient):
        response = await self._classify(client, confidence=0.97)
        assert abs(response.json()["confidence"] - 0.97) < 1e-6

    async def test_heatmap_b64_matches_mock(self, client: httpx.AsyncClient):
        response = await self._classify(client, heatmap=_FAKE_HEATMAP)
        assert response.json()["heatmap_b64"] == _FAKE_HEATMAP

    async def test_heatmap_empty_when_gradcam_pipeline_fails(self, client: httpx.AsyncClient):
        """If get_model() raises, route returns 200 with heatmap_b64=''."""
        with (
            patch(_ROUTE_PREDICT, return_value=("NORMAL", 0.97)),
            patch(_ROUTE_GET_MODEL, side_effect=RuntimeError("model not loaded")),
        ):
            response = await client.post(
                "/classify",
                files={"file": ("chest.jpg", _jpeg_bytes(), "image/jpeg")},
            )
        assert response.status_code == 200
        assert response.json()["heatmap_b64"] == ""


class TestClassifyErrors:

    async def test_gif_returns_400(self, client: httpx.AsyncClient):
        response = await client.post(
            "/classify",
            files={"file": ("anim.gif", _gif_bytes(), "image/gif")},
        )
        assert response.status_code == 400

    async def test_gif_detail_mentions_format(self, client: httpx.AsyncClient):
        response = await client.post(
            "/classify",
            files={"file": ("anim.gif", _gif_bytes(), "image/gif")},
        )
        detail = response.json().get("detail", "")
        assert any(token in detail for token in ("GIF", "Unsupported", "format", "unsupported"))

    async def test_garbage_bytes_returns_400(self, client: httpx.AsyncClient):
        garbage = b"\x00\x01\x02\x03\xff\xfe" * 100
        response = await client.post(
            "/classify",
            files={"file": ("bad.bin", garbage, "application/octet-stream")},
        )
        assert response.status_code == 400

    async def test_empty_file_returns_client_error(self, client: httpx.AsyncClient):
        response = await client.post(
            "/classify",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert response.status_code in (400, 422)

    async def test_missing_file_field_returns_422(self, client: httpx.AsyncClient):
        response = await client.post("/classify")
        assert response.status_code == 422

    async def test_model_inference_exception_returns_500(self, client: httpx.AsyncClient):
        with patch(_ROUTE_PREDICT, side_effect=RuntimeError("GPU OOM")):
            response = await client.post(
                "/classify",
                files={"file": ("chest.jpg", _jpeg_bytes(), "image/jpeg")},
            )
        assert response.status_code == 500

    async def test_model_inference_500_detail_is_string(self, client: httpx.AsyncClient):
        with patch(_ROUTE_PREDICT, side_effect=RuntimeError("GPU OOM")):
            response = await client.post(
                "/classify",
                files={"file": ("chest.jpg", _jpeg_bytes(), "image/jpeg")},
            )
        assert isinstance(response.json().get("detail"), str)
