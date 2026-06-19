from fastapi import APIRouter

from schemas.response import GalleryImage, GalleryResponse
from services import dataset_service

router = APIRouter()


@router.get("/images", response_model=GalleryResponse)
async def get_images() -> GalleryResponse:
    """Return the curated gallery of chest X-ray images."""
    raw_images = dataset_service.get_gallery_images()
    images = [
        GalleryImage(
            id=img["id"],
            url=img["url"],
            label=img["label"],
            index=img["index"],
        )
        for img in raw_images
    ]
    return GalleryResponse(images=images, total=len(images))
