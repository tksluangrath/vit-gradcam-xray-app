# Docker Deployment Guide

How to run the Medical Image Classification App with Docker and docker-compose on any machine.

---

## Quick Start

```bash
# From project root
docker-compose up --build
```

Visit **http://localhost:5173**. Allow 3–5 minutes on first run for the model and dataset to download.

---

## Environment Variables

All variables are set in the `environment` block of `docker-compose.yml`. None are required from the host unless you need HuggingFace authentication.

| Variable | Default | Purpose |
|---|---|---|
| `MODEL_ID` | `lxyuan/vit-base-patch16-224-finetuned-chest-xray` | HuggingFace ViT model |
| `DATASET_NAME` | `hf-vision/chest-xray-pneumonia` | HuggingFace dataset for gallery |
| `GALLERY_CACHE_DIR` | `/app/cache/gallery` | Where processed gallery JPEGs are stored |
| `HF_HOME` | `/app/.cache/huggingface` | HuggingFace cache directory (user-independent path) |
| `HF_TOKEN` | (empty) | HuggingFace API token — set on host if needed for private repos |
| `HUGGING_FACE_HUB_TOKEN` | (same as `HF_TOKEN`) | Legacy alias — set automatically from `HF_TOKEN` |
| `ALLOWED_ORIGINS` | JSON list of allowed CORS origins | Add any extra origins here for remote access |
| `API_PORT` | `8000` | Backend port inside the container |
| `DOWNLOAD_RETRIES` | `3` | How many times to retry HuggingFace downloads |
| `DOWNLOAD_RETRY_DELAY` | `5.0` | Initial delay (seconds) between retries (doubles each attempt) |

### Using a HuggingFace Token

If your dataset or model requires authentication, set `HF_TOKEN` on your host before running:

```bash
export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
docker-compose up --build
```

The compose file passes `${HF_TOKEN:-}` into the container automatically.

---

## Volumes

Two named volumes persist data across container restarts:

| Volume | Container path | Contents |
|---|---|---|
| `hf_cache` | `/app/.cache/huggingface` | Downloaded model weights + dataset metadata (~500 MB) |
| `gallery_cache` | `/app/cache/gallery` | Processed gallery JPEGs (24 images, ~50 MB) |

**Why this matters:** Without persistent volumes, each `docker-compose up` re-downloads 330 MB of model weights and ~200 MB of dataset data. With volumes, subsequent starts take under 10 seconds.

**To use a host directory instead of a named volume** (useful for inspecting cache contents):

```yaml
volumes:
  hf_cache:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/on/host/.cache/huggingface
```

---

## First-Run Timeline

| Time | What's happening |
|---|---|
| 0–30s | Docker builds images, pip installs dependencies |
| 30–90s | `hf-vision/chest-xray-pneumonia` dataset downloads (~200 MB) |
| 90–150s | 24 gallery images extracted and cached to disk |
| 150–240s | `lxyuan/vit-base-patch16-224-finetuned-chest-xray` model downloads (~330 MB) |
| 240s+ | Model loads into memory, health check passes, frontend starts |

**Total first run: ~3–5 minutes** depending on network speed.
**Subsequent runs: <10 seconds** (all data in volumes).

Monitor progress:
```bash
docker-compose logs -f backend
```

---

## Health Check

The backend health check polls `GET /health`. The endpoint returns:

- `200 {"status": "ok"}` — model and gallery both loaded
- `503 {"status": "loading", "model": "...", "gallery": "..."}` — still starting up

`start_period: 300s` gives the container 5 minutes before the health check fires, preventing false "unhealthy" states on slow networks. Increase this for very slow connections:

```yaml
healthcheck:
  start_period: 600s
```

---

## Resource Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| Disk (Docker images) | 2 GB | 3 GB |
| Disk (volumes, first run) | 600 MB | 1 GB |
| RAM | 3 GB | 4–6 GB |
| Network | Any | 10+ Mbps for faster first-run download |

On **Docker Desktop (Mac/Windows):** Preferences → Resources → Memory → set to 4 GB minimum.

---

## Common Commands

```bash
# Start (build images if needed)
docker-compose up --build

# Start in background
docker-compose up -d --build

# Watch backend logs
docker-compose logs -f backend

# Check container status
docker-compose ps

# Stop containers (keeps volumes)
docker-compose down

# Stop and delete all volumes (forces fresh download on next start)
docker-compose down -v

# Shell into backend container
docker-compose exec backend bash

# Run a one-off Python command inside the backend
docker-compose exec backend python -c "from services import model_service; print('ok')"
```

---

## Troubleshooting

See [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) for solutions to:

- Gallery shows error / no images loading
- Backend crashes or restart loop
- Health check failing / frontend never starts
- Model fails to load / classify returns 503
- CORS errors in browser console
- Network timeouts / HuggingFace unreachable
