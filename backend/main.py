import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from services import dataset_service, model_service
from routes import classify, images, dataset_info

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Module-level flag to distinguish "still loading" from "loaded but degraded"
startup_complete: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup: cache gallery images and load the ViT model."""
    global startup_complete

    logger.info("=== Starting up Medical Image Classifier API ===")

    logger.info("Step 1/2: Caching gallery images from dataset...")
    try:
        dataset_service.load_and_cache_gallery(
            cache_dir=settings.GALLERY_CACHE_DIR,
            per_class=settings.GALLERY_PER_CLASS,
        )
    except Exception as exc:
        # Non-fatal: app still starts but gallery will be empty
        logger.error("Gallery caching failed — app will start with empty gallery: %s", exc)

    logger.info("Step 2/2: Loading ViT model from HuggingFace Hub...")
    try:
        model_service.load_model(settings.MODEL_ID)
    except Exception as exc:
        # Fatal for classification, but let other routes remain available
        logger.error("Model loading failed — /classify will be unavailable: %s", exc)

    startup_complete = True
    logger.info("=== Startup complete. API is ready. ===")
    yield
    logger.info("=== Shutting down. ===")


# Ensure gallery cache directory exists before StaticFiles tries to mount it
os.makedirs(settings.GALLERY_CACHE_DIR, exist_ok=True)

app = FastAPI(
    title="Medical Image Classifier",
    description="Chest X-ray pneumonia detection via Vision Transformer (ViT) + Grad-CAM.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve cached gallery images as static files
app.mount(
    "/static/gallery",
    StaticFiles(directory=settings.GALLERY_CACHE_DIR),
    name="gallery",
)

# API routers
app.include_router(classify.router, tags=["Classification"])
app.include_router(images.router, tags=["Gallery"])
app.include_router(dataset_info.router, tags=["Dataset"])


@app.get("/health", tags=["Health"])
async def health_check(response: Response) -> dict[str, str]:
    model_ready = model_service.is_loaded()
    gallery_ready = len(dataset_service.get_gallery_images()) > 0

    # Still loading: model not ready or startup hasn't finished
    if not startup_complete or not model_ready:
        response.status_code = 503
        return {"status": "loading"}

    # Model loaded but gallery is empty — functional but degraded
    if not gallery_ready:
        return {"status": "degraded", "gallery": "empty"}

    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.API_PORT, reload=True)
