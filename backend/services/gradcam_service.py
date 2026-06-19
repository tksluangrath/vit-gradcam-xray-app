from __future__ import annotations

import logging

import cv2
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAMPlusPlus
from transformers import ViTForImageClassification, ViTImageProcessor

logger = logging.getLogger(__name__)


def reshape_transform(tensor: torch.Tensor, height: int = 14, width: int = 14) -> torch.Tensor:
    """
    Reshape ViT attention output tokens to a spatial grid for Grad-CAM.

    ViT produces [batch, seq_len, hidden_dim] where seq_len = 1 (cls) + 14*14 patches.
    We strip the cls token and reshape to [batch, hidden_dim, height, width].
    """
    result = tensor[:, 1:, :].reshape(tensor.size(0), height, width, tensor.size(2))
    result = result.transpose(2, 3).transpose(1, 2)
    return result


def generate_heatmap(
    pil_image: Image.Image,
    model: ViTForImageClassification,
    processor: ViTImageProcessor,
) -> np.ndarray:
    """
    Generate a Grad-CAM activation map for the given image.

    Returns:
        A 2D numpy float array (0-1) of shape (224, 224).
    """
    try:
        target_layer = model.vit.encoder.layer[-1].layernorm_before

        inputs = processor(images=pil_image, return_tensors="pt")
        input_tensor = inputs["pixel_values"]

        with GradCAMPlusPlus(
            model=model,
            target_layers=[target_layer],
            reshape_transform=reshape_transform,
        ) as cam:
            # targets=None tells GradCAMPlusPlus to use the top predicted class
            # automatically, avoiding a redundant forward pass.
            grayscale_cam = cam(input_tensor=input_tensor, targets=None)

        # grayscale_cam shape: (1, H, W) — take the first (and only) batch item
        cam_mask: np.ndarray = grayscale_cam[0].astype(np.float32)

        # Zero out low-activation noise below the threshold
        cam_mask[cam_mask < 0.3] = 0.0

        # Smooth the mask so the heatmap region looks more natural
        cam_mask = cv2.GaussianBlur(cam_mask, (11, 11), 0)

        return cam_mask

    except Exception as exc:
        logger.warning("Grad-CAM generation failed: %s. Returning blank mask.", exc)
        return np.zeros((224, 224), dtype=np.float32)
