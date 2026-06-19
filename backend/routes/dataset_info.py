from fastapi import APIRouter

from schemas.response import ClassDistribution, DatasetInfoResponse
from services import dataset_service
from config import settings

router = APIRouter()


@router.get("/dataset-info", response_model=DatasetInfoResponse)
async def get_dataset_info() -> DatasetInfoResponse:
    """Return dataset metadata and class distribution statistics."""
    stats = dataset_service.get_dataset_stats()
    dist = stats.get("class_distribution", {"NORMAL": 0, "PNEUMONIA": 0})

    return DatasetInfoResponse(
        name=settings.DATASET_NAME,
        hf_url=settings.HF_DATASET_URL,
        train_count=stats.get("train_count", 0),
        test_count=stats.get("test_count", 0),
        validation_count=stats.get("validation_count", 0),
        class_distribution=ClassDistribution(
            NORMAL=dist.get("NORMAL", 0),
            PNEUMONIA=dist.get("PNEUMONIA", 0),
        ),
    )
