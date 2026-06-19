# Docker Troubleshooting Guide

Covers the most common failures when deploying the Medical Image Classification App in Docker on a new machine.

---

## Problem: Gallery Shows Error / No Images Loading

### Symptoms
- Frontend shows an error banner where the image grid should be
- `GET /api/images` returns an empty array
- Backend logs contain warnings about dataset loading

### Root Causes (in order of likelihood)

| Cause | Indicator in logs |
|---|---|
| Wrong dataset ID (typo or stale value instead of `hf-vision/chest-xray-pneumonia`) | `FileNotFoundError` or 404 from HuggingFace Hub |
| `HF_HOME` not set / volume mounted to wrong path | Cache downloaded fresh every restart |
| Network timeout downloading ~200 MB dataset | `ConnectionTimeout` or `ChunkedEncodingError` |
| `HF_TOKEN` missing for a dataset that requires auth | HTTP 401 / 403 in logs |
| Docker named volume shadowed the `mkdir` layer | `RuntimeError: Directory does not exist` at startup |
| Insufficient disk space | `No space left on device` |

### Step-by-Step Resolution

**1. Check the logs for the exact error:**
```bash
docker-compose logs backend | grep -A 10 "Loading dataset"
```

**2. Verify `HF_HOME` is set in the container:**
```bash
docker-compose exec backend env | grep HF_
# Expected:
# HF_HOME=/app/.cache/huggingface
# HF_TOKEN=... (if set on host)
```

**3. Confirm the volume mount is correct:**
```bash
docker volume inspect medical-image-classification-app-prd_hf_cache
# "Mountpoint" should exist and be non-empty after first run
docker-compose exec backend ls /app/.cache/huggingface/
# Should show: datasets/ hub/ (or similar)
```

**4. Test dataset download manually inside the container:**
```bash
docker-compose exec backend python -c "
from datasets import load_dataset
ds = load_dataset('hf-vision/chest-xray-pneumonia', split='test')
print('Success:', len(ds), 'images')
"
```

**5. Check disk space:**
```bash
docker-compose exec backend df -h /app/.cache/huggingface/
# Need at least 500 MB free
```

**6. Nuclear option — clear volumes and restart:**
```bash
docker-compose down -v   # removes volumes
docker-compose up --build
docker-compose logs -f backend   # watch for "Gallery cached: 24 images"
```

### Verification
- `docker-compose logs backend` shows `Gallery cached: 24 images`
- `curl http://localhost:8000/images` returns a JSON array with 24 entries
- Frontend gallery grid is populated

---

## Problem: Backend Container Crashes on Startup / Restart Loop

### Symptoms
- `docker-compose ps` shows backend as `Exit 1` or `Restarting`
- Frontend never starts (depends on healthy backend)

### Root Causes
- Unhandled exception in lifespan startup (fixed in this codebase — both steps now have try/except)
- `StaticFiles` mount fails because `/app/cache/gallery` doesn't exist when the Docker volume shadows the image layer

### Resolution
The `os.makedirs(settings.GALLERY_CACHE_DIR, exist_ok=True)` call at module level in `main.py` prevents the `StaticFiles` crash. If you see this error, ensure you are running the current version of `main.py`.

```bash
docker-compose exec backend python -c "import main; print('OK')"
```

---

## Problem: Health Check Fails / Frontend Never Starts

### Symptoms
- `docker-compose ps` shows backend as `Up (unhealthy)`
- Frontend exits immediately because `depends_on: condition: service_healthy` is not satisfied

### Root Causes
- `start_period` in docker-compose.yml was too short (120s). A cold download of the model + dataset can take 4–5 minutes.
- Health endpoint returned 200 even while still loading (fixed — now returns 503 with `"status": "loading"` until ready)

### Resolution
`start_period` is now set to `300s` in docker-compose.yml. If you are on a very slow connection, increase it further:

```yaml
healthcheck:
  start_period: 600s   # 10 minutes
```

Watch the startup progress:
```bash
docker-compose logs -f backend
# Wait for: "=== Startup complete. API is ready. ==="
# Then health check will return 200
```

---

## Problem: Model Download Returns 401 Unauthorized (Model Went Private)

### Symptoms
- Backend exits with code 3 immediately after gallery caching succeeds
- Logs contain:
  ```
  RepositoryNotFoundError: 401 Client Error.
  Repository Not Found for url: https://huggingface.co/...
  Invalid username or password.
  OSError: ... is not a local folder and is not a valid model identifier
  ERROR: Application startup failed. Exiting.
  ```

### Root Cause
The HuggingFace model repository has been made **private or gated** after the Docker image was built. Anonymous downloads return 401. This happened with `lxyuan/vit-base-patch16-224-finetuned-chest-xray` on 2026-03-19.

**This is not a credentials problem** — no amount of token configuration will help if the model owner has restricted access entirely.

### Resolution

The project now uses `nickmuchi/vit-finetuned-chest-xray-pneumonia` as the model, which is verified public (no gating, `"private": false`), same ViT-Base-Patch16-224 architecture, and identical `id2label` mapping (`{0: "NORMAL", 1: "PNEUMONIA"}`).

**Verify `config.py` and `docker-compose.yml` both reference the current model:**
```bash
grep MODEL_ID backend/config.py docker-compose.yml
# Both should show: nickmuchi/vit-finetuned-chest-xray-pneumonia
```

**Rebuild the image after any model ID change:**
```bash
docker-compose down
docker-compose up --build
```

**If you need to find a replacement model in the future:**
1. Search HuggingFace Hub for `ViTForImageClassification chest xray`
2. Confirm `"private": false` and `"gated": false` via the HF API: `https://huggingface.co/api/models/<repo_id>`
3. Confirm architecture is `ViTForImageClassification` with `ViTImageProcessor`
4. Confirm `id2label` contains NORMAL/PNEUMONIA (or variants handled by label normalization in `model_service.py`)
5. Update `MODEL_ID` in both `backend/config.py` and `docker-compose.yml`

---

## Problem: Model Fails to Load / `/classify` Returns 503

### Symptoms
- Gallery loads fine but clicking an image shows an error
- Backend logs: `Model load failed`

### Resolution

**Check model cache size:**
```bash
docker-compose exec backend du -sh /app/.cache/huggingface/
# Should be ~400 MB+ after first run (model + dataset metadata)
```

**Test model loading manually:**
```bash
docker-compose exec backend python -c "
from transformers import ViTForImageClassification, ViTImageProcessor
p = ViTImageProcessor.from_pretrained('nickmuchi/vit-finetuned-chest-xray-pneumonia')
m = ViTForImageClassification.from_pretrained('nickmuchi/vit-finetuned-chest-xray-pneumonia')
print('Model OK, labels:', m.config.id2label)
"
```

**Memory check:** The model requires ~1–2 GB RAM. Ensure Docker Desktop has at least 4 GB allocated (Preferences → Resources → Memory).

---

## Problem: CORS Errors in Browser Console

### Symptoms
- Browser console: `CORS policy: No 'Access-Control-Allow-Origin' header`
- Happens when accessing via Docker host IP (e.g., `192.168.x.x:5173`) instead of `localhost`

### Resolution
`ALLOWED_ORIGINS` in `docker-compose.yml` now includes `http://frontend:5173` (Docker-internal) and `"*"` via the config default. If you need a specific external origin:

```yaml
environment:
  - ALLOWED_ORIGINS=["http://frontend:5173","http://localhost:5173","http://192.168.1.100:5173"]
```

---

## Problem: Network Timeouts / HuggingFace Unreachable

### Symptoms
- `Connection timeout` or `Temporary failure in name resolution` in logs
- Works on one machine, fails on another

### Resolution

**Test DNS from inside the container:**
```bash
docker-compose exec backend python -c "import socket; print(socket.gethostbyname('huggingface.co'))"
```

If DNS fails, add explicit resolvers to docker-compose.yml:
```yaml
services:
  backend:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

**Retry logic** is already built into `dataset_service.py` and `model_service.py` (3 attempts with exponential backoff). If your network is consistently slow, increase retries via `DOWNLOAD_RETRIES` env var:

```yaml
environment:
  - DOWNLOAD_RETRIES=5
  - DOWNLOAD_RETRY_DELAY=10.0
```

---

## Deployment Checklist (New Machine)

### Pre-flight
- [ ] Docker and docker-compose installed
- [ ] 2+ GB free disk space
- [ ] 4+ GB RAM available in Docker Desktop
- [ ] Outbound HTTPS access to `huggingface.co`

### Startup
```bash
docker-compose up --build
docker-compose logs -f backend
```

### Expected log sequence (first run, ~3–5 min)
```
=== Starting up Medical Image Classifier API ===
Step 1/2: Caching gallery images from dataset...
Loading dataset: hf-vision/chest-xray-pneumonia (test split)...
Gallery cached: 24 images.
Step 2/2: Loading ViT model from HuggingFace Hub...
Loading ViT model: nickmuchi/vit-finetuned-chest-xray-pneumonia (attempt 1/3)
Model loaded successfully.
=== Startup complete. API is ready. ===
```

### Verification Checklist
- [ ] `docker-compose ps` shows backend as `Up (healthy)`
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:8000/images` returns 24 image entries
- [ ] Frontend at `http://localhost:5173` shows populated image gallery
- [ ] Clicking an image shows diagnostic report with confidence bar and heatmap
- [ ] No errors in `docker-compose logs backend`
- [ ] No errors in browser DevTools console
