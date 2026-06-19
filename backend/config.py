from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    MODEL_ID: str = "nickmuchi/vit-finetuned-chest-xray-pneumonia"
    DATASET_NAME: str = "hf-vision/chest-xray-pneumonia"
    IMG_SIZE: int = 224
    MAX_GALLERY_IMAGES: int = 24
    GALLERY_PER_CLASS: int = 12
    GALLERY_CACHE_DIR: str = "/app/cache/gallery"
    API_PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "*"]
    )
    HF_DATASET_URL: str = (
        "https://huggingface.co/datasets/hf-vision/chest-xray-pneumonia"
    )
    DOWNLOAD_RETRIES: int = 3
    DOWNLOAD_RETRY_DELAY: float = 5.0

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
