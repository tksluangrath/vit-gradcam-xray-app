---
noteId: "19c2ce90232711f1884e0917dd4ae7f4"
tags: []

---

# Custom Image Upload — User Guide

How to upload and classify your own chest X-ray images in the Medical Image Classification App.

---

## Quick Start

1. Drag a JPEG or PNG chest X-ray onto the **Upload zone** (above the gallery), or click it to browse
2. Wait 5–10 seconds for classification
3. View your diagnostic report in the right panel

---

## Supported Files

| Format | Max Size |
|---|---|
| JPEG (.jpg / .jpeg) | 10 MB |
| PNG (.png) | 10 MB |

Other formats (GIF, TIFF, BMP, WebP) are not supported. Convert them first using Preview (Mac) or Paint (Windows).

---

## Understanding Your Report

**Predicted Label** — `NORMAL` or `PNEUMONIA`. This is the model's best guess, not a clinical diagnosis.

**Confidence Score** — How certain the model is. High confidence (≥ 80%) means a clear prediction; low confidence (< 50%) means the image may be ambiguous or unusual for this model.

**Grad-CAM Heatmap** — Red/orange regions show where the model focused. This indicates attention, not clinical significance.

**Clinical Disclaimer** — Always visible. This tool is for **educational purposes only** and is not a substitute for professional medical diagnosis.

---

## Your Privacy

- Uploaded images are processed and immediately discarded — never stored
- Images are not used to retrain the model
- Images are not shared with third parties

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Only JPEG and PNG supported" | Convert your image to JPEG or PNG first |
| "File too large (max 10 MB)" | Compress at TinyPNG.com, or reduce resolution in an image editor |
| "Upload timed out" | Check your internet connection, then click **Retry** |
| "Classification failed" | Wait a moment and click **Retry**; if it persists, refresh the page |
| Image looks pixelated in report | Expected — model processes all images at 224×224 px |

---

## Tips for Best Results

- Use a clear frontal chest X-ray in normal anatomical orientation
- Remove annotations/labels if possible — they can distract the model
- If confidence is low (< 60%), treat the result with extra skepticism
- Always verify with a qualified radiologist or physician

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `Tab` | Navigate to the upload zone |
| `Enter` or `Space` | Open the file picker |
| `Tab` (after error) | Navigate to Retry button |
