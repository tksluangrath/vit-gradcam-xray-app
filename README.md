---
noteId: "cc04fcc01b1811f1884e0917dd4ae7f4"
tags: []

---

# Medical Image Classification App

A portfolio-grade web app for chest X-ray pneumonia detection using a Vision Transformer (ViT) model, Grad-CAM visualization, and the HuggingFace `chest-xray-pneumonia` dataset.

> **Screenshot coming soon**

---

## Features

- **Image Gallery** — 20+ curated chest X-ray images in a responsive grid; click to select
- **Classification Engine** — FastAPI `/classify` endpoint with ViT inference, responds under 10s
- **Diagnostic Report** — Prediction label, confidence score, Grad-CAM heatmap overlay, model metadata
- **Dataset Info Panel** — HuggingFace link, train/test/validation splits, class distribution chart

---

## Tech Stack

**Backend**
- FastAPI 0.111 + Uvicorn
- PyTorch 2.3 + HuggingFace Transformers 4.41
- HuggingFace Datasets 2.19
- pytorch-grad-cam 1.4.8
- Pillow + OpenCV (headless)

**Frontend**
- React 18 + Vite 5 + TypeScript 5 (strict mode)
- Axios for HTTP
- React useState/useContext (no Redux)

**Model:** `lxyuan/vit-base-patch16-224-finetuned-chest-xray`
**Dataset:** `hf-vision/chest-xray-pneumonia`

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- ~4 GB free disk space (model download ~330 MB + gallery cache)

---

## Setup & Installation

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running the App

### 1. Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**First startup** downloads the ViT model (~330 MB) and caches 24 gallery images — allow 2–5 minutes.
Interactive API docs available at `http://localhost:8000/docs`.

### 2. Start the frontend (new terminal)

```bash
cd frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check → `{"status": "ok"}` |
| `GET` | `/images` | Gallery image list → `{images[], total}` |
| `GET` | `/dataset-info` | Dataset metadata + class distribution |
| `POST` | `/classify` | Classify an X-ray image |

### POST /classify

**Request:** `multipart/form-data`
```
file: <JPEG or PNG image bytes>
```

**Response 200:**
```json
{
  "label": "PNEUMONIA",
  "confidence": 0.942,
  "heatmap_b64": "data:image/png;base64,...",
  "model_metadata": {
    "model_id": "lxyuan/vit-base-patch16-224-finetuned-chest-xray",
    "dataset": "hf-vision/chest-xray-pneumonia",
    "version": "1.0.0",
    "framework": "pytorch"
  }
}
```

**Response 400:** Unsupported image format (only JPEG/PNG accepted)
**Response 500:** Model inference failure

---

## Project Structure

```
Medical-Image-Classification-App-PRD/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, lifespan startup
│   ├── config.py                # Pydantic settings
│   ├── requirements.txt
│   ├── routes/
│   │   ├── classify.py          # POST /classify
│   │   ├── images.py            # GET /images
│   │   └── dataset_info.py      # GET /dataset-info
│   ├── services/
│   │   ├── model_service.py     # ViT singleton + predict()
│   │   ├── gradcam_service.py   # Grad-CAM with ViT reshape transform
│   │   └── dataset_service.py   # Dataset download + gallery cache
│   ├── schemas/
│   │   └── response.py          # Pydantic response models
│   └── utils/
│       ├── image_utils.py       # JPEG/PNG validation + resize
│       └── heatmap_utils.py     # OpenCV colormap blend → base64
│
└── frontend/
    ├── index.html
    ├── vite.config.ts           # Vite proxy: /api → :8000, /static → :8000
    ├── tsconfig.json            # strict: true
    └── src/
        ├── App.tsx
        ├── context/AppContext.tsx
        ├── hooks/               # useGallery, useClassify, useDatasetInfo
        ├── api/client.ts        # Axios instance
        ├── types/api.ts         # TypeScript interfaces
        └── components/
            ├── layout/          # Header, TwoColumnLayout
            ├── gallery/         # ImageGallery, GalleryGrid, GalleryItem, GalleryLoader
            ├── report/          # DiagnosticReport, PredictionLabel, ConfidenceBar,
            │                    # GradCamOverlay, ModelMetadata, ClinicalDisclaimer
            ├── dataset/         # DatasetInfoPanel
            └── shared/          # LoadingSpinner, ErrorBanner
```

---

## Clinical Disclaimer

> **This tool is for educational purposes only and is not a substitute for professional medical diagnosis.**

This application demonstrates machine learning in medical imaging. It must not be used for clinical decision-making. Always consult qualified healthcare professionals.

---

## License

MIT
