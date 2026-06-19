import base64
import io
import cv2
import numpy as np
from PIL import Image


def overlay_heatmap(original_pil: Image.Image, cam_mask: np.ndarray) -> str:
    """
    Blend a Grad-CAM mask over the original image and return as a base64 PNG data URI.

    Uses COLORMAP_INFERNO for a clinical look (dark=low, yellow-white=high activation).
    Blend is 50/50 for a strong visual signal. The largest high-activation contour
    is outlined in yellow so the suspicious region boundary is clearly visible.

    Args:
        original_pil: Original PIL image (RGB, 224×224).
        cam_mask: 2D float array (0-1) representing the CAM activations.

    Returns:
        A data URI string: "data:image/png;base64,..."
    """
    # Ensure cam_mask matches original image dimensions
    original_np_check = np.array(original_pil.convert("RGB"))
    orig_h, orig_w = original_np_check.shape[:2]
    if cam_mask.shape != (orig_h, orig_w):
        cam_mask = cv2.resize(cam_mask, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)

    # Convert mask to uint8 and apply INFERNO colormap (dark→low, bright yellow-white→high)
    mask_uint8 = np.uint8(255 * cam_mask)
    colormap = cv2.applyColorMap(mask_uint8, cv2.COLORMAP_INFERNO)
    colormap_rgb = cv2.cvtColor(colormap, cv2.COLOR_BGR2RGB)

    # Convert original PIL to numpy
    original_np = np.array(original_pil.convert("RGB"), dtype=np.float32)
    colormap_np = colormap_rgb.astype(np.float32)

    # Alpha blend: 50% original + 50% heatmap for stronger visual signal
    blended = original_np * 0.5 + colormap_np * 0.5
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    # Draw a contour around the largest high-activation region for clinical clarity
    binary_mask = (cam_mask >= 0.5).astype(np.uint8)
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        blended_bgr = cv2.cvtColor(blended, cv2.COLOR_RGB2BGR)
        cv2.drawContours(blended_bgr, [largest], -1, (0, 255, 255), thickness=2)
        blended = cv2.cvtColor(blended_bgr, cv2.COLOR_BGR2RGB)

    # Encode as PNG base64 data URI
    result_pil = Image.fromarray(blended)
    buffer = io.BytesIO()
    result_pil.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
