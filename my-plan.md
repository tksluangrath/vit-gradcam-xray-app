# Medical Image Classification App - PRD

## Overview
A portfolio-grade web app that classifies chest X-ray images for pneumonia detection using a Vision Transformer (ViT) model and the `chest-xray-pneumonia` HuggingFace dataset. Users browse a gallery of real dataset images, select one, and receive a full diagnostic report.

---

## Feature 1: Image Gallery
- Load a curated sample of images from the `chest-xray-pneumonia` HuggingFace dataset on app startup
- Display images in a responsive grid (thumbnail size, labeled with index)
- User clicks an image to select it for classification
- Selected image is highlighted and displayed in a larger preview panel
- Test: Gallery renders at least 20 images on load within 5 seconds; clicking an image updates the preview panel without page reload

## Feature 2: Classification Engine (FastAPI Backend)
- On image selection, frontend sends the image to a `/classify` POST endpoint
- Backend runs the image through a pretrained ViT model fine-tuned on chest X-rays (loaded from HuggingFace Hub)
- Returns: predicted label (Normal / Pneumonia), confidence score, Grad-CAM heatmap data, and model metadata
- Test: `/classify` responds in under 10 seconds; returns valid JSON with all four fields; handles unsupported image formats with a 400 error

## Feature 3: Diagnostic Report
- After classification, display a structured report panel with:
  - **Prediction label** — e.g., "Pneumonia" or "Normal"
  - **Confidence score** — e.g., "94.2%"
  - **Grad-CAM heatmap** — original X-ray with colored overlay highlighting regions that influenced the prediction
  - **Model metadata** — model name, dataset it was trained on, version
  - **Clinical disclaimer** — "This tool is for educational purposes only and is not a substitute for professional medical diagnosis."
- Test: Report renders within 2 seconds of API response; heatmap overlays correctly on source image; disclaimer is always visible

## Feature 4: Dataset Info Panel
- Sidebar or footer section showing:
  - Dataset name and HuggingFace link
  - Total images in dataset (train/test split info)
  - Class distribution (Normal vs Pneumonia counts)
- Test: Panel renders on page load; HuggingFace link opens in new tab

---

## UI Decisions
- React frontend (Vite + TypeScript)
- Clean, medical-adjacent aesthetic: white/light gray background, minimal color, professional typography
- Two-panel layout: gallery on left, report on right
- Mobile-responsive but desktop-first
- No authentication required — fully public portfolio demo

## Technical Decisions
- **Backend:** FastAPI (Python)
- **Model:** ViT from HuggingFace Transformers (`transformers` library)
- **Dataset:** `chest-xray-pneumonia` loaded via `datasets` library at startup
- **Grad-CAM:** Implemented with `pytorch-grad-cam` library
- **Image format:** JPEG/PNG only; resize to 224x224 before inference
- **State management:** React useState/useContext (no Redux needed at this scale)
- **API communication:** Axios or fetch with async/await
- **CORS:** FastAPI CORS middleware enabled for local dev
- **Deployment:** Not decided — build locally first, then evaluate HuggingFace Spaces or cloud provider

## Out of Scope (for now)
- User authentication or saved history
- Uploading custom images (gallery-only for now)
- Multiple disease types beyond pneumonia
- Model fine-tuning or training within the app
