import logging

from fastapi import APIRouter, HTTPException, UploadFile, File

from schemas.response import ClassifyResponse, ModelMetadata
from services import model_service, gradcam_service, dataset_service
from utils.image_utils import validate_and_resize
from utils.heatmap_utils import overlay_heatmap
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/classify", response_model=ClassifyResponse)
async def classify_image(file: UploadFile = File(...)) -> ClassifyResponse:
    """
    Classify a chest X-ray image and return prediction + Grad-CAM heatmap.
    Accepts JPEG or PNG only; returns 400 for unsupported formats.
    Maximum upload size: 10 MB.
    """
    image_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum upload size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    # Validate format and resize to 224×224
    pil_image = validate_and_resize(image_bytes)

    try:
        label, confidence = model_service.predict(pil_image)
    except Exception as exc:
        logger.error("Model inference failed: %s", exc)
        raise HTTPException(status_code=500, detail="Model inference failed. Please try again.")

    try:
        model = model_service.get_model()
        processor = model_service.get_processor()
        cam_mask = gradcam_service.generate_heatmap(pil_image, model, processor)
        heatmap_b64 = overlay_heatmap(pil_image, cam_mask)
        region_detected = bool(cam_mask.max() > 0.5)
    except Exception as exc:
        logger.warning("Heatmap generation failed: %s", exc)
        # Return result without heatmap rather than failing the whole request
        heatmap_b64 = ""
        region_detected = False

    metadata = ModelMetadata(
        model_id=settings.MODEL_ID,
        dataset=settings.DATASET_NAME,
        version="1.0.0",
        framework="pytorch",
    )

    return ClassifyResponse(
        label=label,
        confidence=confidence,
        heatmap_b64=heatmap_b64,
        region_detected=region_detected,
        model_metadata=metadata,
    )
