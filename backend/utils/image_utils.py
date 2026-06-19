import io
from PIL import Image
from fastapi import HTTPException

# Limit decompression to ~10 MP to prevent decompression bomb attacks
Image.MAX_IMAGE_PIXELS = 10_000_000


def validate_and_resize(image_bytes: bytes) -> Image.Image:
    """Validate that image is JPEG or PNG and resize to 224×224."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read image. Ensure the file is a valid JPEG or PNG.",
        )

    if image.format not in ("JPEG", "PNG"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported image format '{image.format}'. "
                "Only JPEG and PNG are accepted."
            ),
        )

    image = image.convert("RGB")
    image = image.resize((224, 224), Image.LANCZOS)
    return image
