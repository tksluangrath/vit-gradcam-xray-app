from typing import Literal

from pydantic import BaseModel, ConfigDict


class ModelMetadata(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_id: str
    dataset: str
    version: str
    framework: str


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    label: Literal["NORMAL", "PNEUMONIA"]
    confidence: float
    heatmap_b64: str
    region_detected: bool
    model_metadata: ModelMetadata


class GalleryImage(BaseModel):
    id: str
    url: str
    label: str
    index: int


class GalleryResponse(BaseModel):
    images: list[GalleryImage]
    total: int


class ClassDistribution(BaseModel):
    NORMAL: int
    PNEUMONIA: int


class DatasetInfoResponse(BaseModel):
    name: str
    hf_url: str
    train_count: int
    test_count: int
    validation_count: int
    class_distribution: ClassDistribution
