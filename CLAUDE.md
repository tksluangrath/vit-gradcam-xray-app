# Medical Image Classification App — Claude Instructions

## Project Overview
A portfolio-grade web app for chest X-ray pneumonia detection using a Vision Transformer (ViT) model and the `chest-xray-pneumonia` HuggingFace dataset. Full diagnostic reports with Grad-CAM heatmaps.

## Stack
- **Frontend:** React + Vite + TypeScript
- **Backend:** FastAPI (Python)
- **Model:** ViT from HuggingFace Transformers (`transformers` library)
- **Dataset:** `chest-xray-pneumonia` via HuggingFace `datasets` library
- **Grad-CAM:** `pytorch-grad-cam` library
- **HTTP:** Axios or fetch with async/await
- **State:** React useState/useContext (no Redux)

## Architecture
- Two-panel layout: gallery (left) + diagnostic report (right)
- Frontend sends selected image to `POST /classify` endpoint
- Backend returns: predicted label, confidence score, Grad-CAM heatmap data, model metadata
- Images resized to 224×224 (JPEG/PNG only); unsupported formats return 400

## Key Features
1. **Image Gallery** — loads 20+ curated dataset images on startup, responsive grid, click-to-select
2. **Classification Engine** — FastAPI `/classify` endpoint, ViT inference, responds under 10s
3. **Diagnostic Report** — label, confidence %, Grad-CAM overlay, model metadata, clinical disclaimer
4. **Dataset Info Panel** — dataset name, HuggingFace link, train/test split info, class distribution

## Coding Conventions
- TypeScript strict mode on frontend
- Python type hints throughout backend
- Keep components small and single-purpose
- No authentication — fully public demo
- CORS middleware enabled for local dev
- Mobile-responsive but desktop-first

## Out of Scope
- User auth or saved history
- Custom image uploads (gallery-only)
- Multiple disease types beyond pneumonia
- In-app model training or fine-tuning

## Clinical Disclaimer (always visible in UI)
> "This tool is for educational purposes only and is not a substitute for professional medical diagnosis."

## Custom Agents
Place custom agent markdown files in `.claude/agents/`. Each file defines a specialized subagent Claude Code can use during development.
