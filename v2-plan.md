# Medical Image Classification App — v2.0 PRD

> Synthesized from five parallel agent reviews: codebase audit (Explore), feature planning (Plan), UI/UX design, performance engineering, and QA strategy.

---

## v1.0 Baseline Assessment

The v1.0 codebase is **complete, clean, and production-ready**. Every feature in the original CLAUDE.md spec is implemented:

- 24-image curated gallery (12 NORMAL / 12 PNEUMONIA)
- ViT inference + Grad-CAM heatmap
- Full diagnostic report panel with confidence bar, model metadata, clinical disclaimer
- Dataset info panel
- Docker + docker-compose deployment with health checks and retry logic
- 61 backend tests (unit + integration), TypeScript strict mode throughout

**Gaps and opportunities identified:**
- `region_detected` field is returned by the API but never used in the UI
- `predict()` discards the losing class probability — both are already computed
- No frontend tests, no CI/CD pipeline
- No prediction caching — same gallery image triggers full ViT inference every time
- Grad-CAM runs synchronously in the same request, doubling inference time
- `prefers-reduced-motion` not implemented anywhere
- Custom image upload was intentionally deferred in v1 — the backend already supports it

---

## v2.0 Goals

1. Transform the demo into an interactive tool (custom uploads)
2. Make inference fast enough to feel instant for gallery images (caching + quantization)
3. Deepen the ML story (both-class probabilities, attention rollout visualization)
4. Reach production-grade quality (CI/CD, test parity, observability)
5. Make it a genuinely impressive visual portfolio piece (design system, dark mode, SVG gauge)

---

## Tier 1 — Must Have for v2.0

These are non-negotiable. Each one is either high-impact/low-effort or directly closes a gap that would embarrass the project in an interview.

---

### 1.1 Custom Image Upload (Drag-and-Drop)

**What:** A `DropZone` component that accepts user-provided JPEG/PNG chest X-rays via drag-and-drop or file picker. Validated client-side (type, size ≤ 10 MB), then posted to `POST /classify` as multipart/form-data.

**Why:** This is the single highest-impact feature for a portfolio piece. Every reviewer will immediately want to upload their own image. The backend already handles arbitrary file bytes — only the UI guard needs to be removed.

**Effort:** S (backend: zero changes; frontend: new `UploadZone.tsx`, new `useImageUpload.ts` hook, update `AppContext` to hold `uploadedImage` state)

**Files:**
- New: `frontend/src/components/upload/DropZone.tsx`
- New: `frontend/src/hooks/useImageUpload.ts`
- Modified: `frontend/src/context/AppContext.tsx`
- Modified: `frontend/src/components/gallery/ImageGallery.tsx` (add "Upload Your Own" section)

---

### 1.2 Both-Class Probability Display

**What:** `predict()` already computes softmax over both classes but discards the losing probability. Return both as `probabilities: { NORMAL: float, PNEUMONIA: float }`. Replace `ConfidenceBar` with a `ProbabilityBands` component showing both values.

**Why:** A model saying "Pneumonia: 91%, Normal: 9%" is very different from "55% / 45%". The second case should visually signal uncertainty. Zero model changes needed — this is already computed.

**Effort:** S

**Files:**
- Modified: `backend/services/model_service.py` — `predict()` returns `tuple[str, float, dict[str, float]]`
- Modified: `backend/schemas/response.py` — add optional `probabilities` field
- Modified: `backend/routes/classify.py` — pass through
- New: `frontend/src/components/report/ProbabilityBands.tsx`
- Modified: `frontend/src/types/api.ts`

---

### 1.3 Prediction Result Cache (In-Memory LRU)

**What:** Gallery images are static with stable filenames. Add an in-memory dict cache in `classify.py` keyed by image hash. At startup, warm the cache by classifying all 24 gallery images. Cache lookup before inference; miss falls through to the full pipeline.

**Why:** Eliminates the 3-8 second ViT inference wait for any previously-seen gallery image. After first run-through of the gallery, every subsequent click is near-instant.

**Effort:** S

**Files:**
- New: `backend/utils/cache_utils.py` (hash-keyed LRU, max 100 entries)
- Modified: `backend/routes/classify.py` — cache check before inference
- Modified: `backend/main.py` — warm cache at startup
- Modified: `backend/routes/classify.py` — expose `cache_size` in `/health`

---

### 1.4 Inference Performance: Quantization + Dedup

**What:** Two independent optimizations:
1. **INT8 dynamic quantization** via `torch.quantization.quantize_dynamic` after `_model.eval()` — no retraining, no accuracy loss. Expected: 1.8–2.5× speedup on CPU.
2. **Eliminate duplicate `processor()` call** — currently called separately in `predict()` and `generate_heatmap()`. Compute once in the route handler, pass `pixel_values` to both.

**Why:** Quantization alone moves cold inference from ~4-8s to ~2-3s on CPU. Combined with caching (1.3), the typical user experience is sub-100ms after first access.

**Effort:** S

**Files:**
- Modified: `backend/services/model_service.py` — add quantization after load
- Modified: `backend/routes/classify.py` — deduplicate preprocessing

---

### 1.5 Grad-CAM / Predict Split (Two-Phase Response)

**What:** Split `POST /classify` into two logical phases: return `label`, `confidence`, and `probabilities` immediately after the forward pass; serve `heatmap_b64` from a separate `GET /heatmap/{image_id}` endpoint. Frontend calls both, showing the prediction immediately while the heatmap loads.

**Why:** Grad-CAM runs a full second forward + backward pass, roughly doubling inference time. Separating them lets the user see the prediction result in ~1-2s while the heatmap appears 1-3s later — dramatically better perceived performance.

**Effort:** M

**Files:**
- New: `backend/routes/heatmap.py`
- Modified: `backend/routes/classify.py`
- Modified: `backend/schemas/response.py`
- Modified: `frontend/src/api/client.ts` — add `fetchHeatmap()`
- Modified: `frontend/src/hooks/useClassify.ts`
- Modified: `frontend/src/context/AppContext.tsx`

---

### 1.6 Attention Rollout Visualization (Third Tab)

**What:** Add ViT native attention visualization alongside Grad-CAM. Extract attention weights from the last transformer layer, average across heads, and apply attention rollout. The existing `GradCamOverlay` tabs (`Original | Heatmap Overlay`) gain a third: `Attention Rollout`.

**Why:** Attention visualization is native to ViT — more architecturally honest than Grad-CAM. Showing both demonstrates deep model understanding. The model layer reference is already in `gradcam_service.py`.

**Effort:** M

**Files:**
- New: `backend/services/attention_service.py`
- Modified: `backend/schemas/response.py` — add optional `attention_b64: str`
- Modified: `backend/routes/classify.py` — call both pipelines concurrently with `asyncio.gather`
- Modified: `frontend/src/components/report/GradCamOverlay.tsx` — add third tab
- Modified: `frontend/src/types/api.ts`

---

### 1.7 Structured Logging + `/metrics` Endpoint

**What:** Replace `logging.basicConfig` with `python-json-logger` for structured JSON logs. Add `GET /metrics` returning Prometheus-compatible text: request counts, inference latency (p50/p95/p99), cache hit rate, error rates.

**Why:** Every production ML system needs observability. This transforms the architecture story from "I built a demo" to "I know how to operate systems."

**Effort:** M

**Files:**
- New: `backend/utils/metrics.py` (Prometheus counters + histograms)
- New: `backend/routes/metrics.py`
- Modified: `backend/main.py` — structured logging config
- Modified: `backend/routes/classify.py` — record per-request timing
- Modified: `backend/requirements.txt` — add `python-json-logger`, `prometheus-client`

**Key metrics to track:**
| Metric | Target |
|---|---|
| `classify_p50_latency` | < 100ms (cached), < 3s (cold) |
| `classify_p95_latency` | < 8s |
| `classify_p99_latency` | < 10s (PRD SLA) |
| `gradcam_failure_rate` | < 1% |
| `cache_hit_rate` | > 80% normal use |

---

### 1.8 Frontend Test Suite (Vitest + React Testing Library)

**What:** Install Vitest + `@testing-library/react` + MSW. Cover: all stateful components, all three hooks, aria attributes, render states.

**Why:** v1 has zero frontend tests. A portfolio project without frontend tests signals junior engineering practice.

**Priority test targets:**
- `ClinicalDisclaimer.tsx` — "always visible" is a compliance requirement; test it in all render states
- `DiagnosticReport.tsx` — 4 render states (no selection / classifying / error / result)
- `PredictionLabel.tsx` — conditional rendering and aria states
- `ConfidenceBar.tsx` — percentage math and color logic
- `GalleryItem.tsx` — `aria-pressed`, click handler, selected state
- `useClassify.ts` — AbortController cancellation is the critical edge case
- `useGallery.ts`, `useDatasetInfo.ts` — cleanup/cancellation on unmount

**Effort:** M (4-5 hours)

**Not to test at unit level:** `GradCamOverlay.tsx` (Canvas API — cover in E2E instead)

---

### 1.9 CI/CD Pipeline (GitHub Actions)

**What:** Two workflows:
1. `ci.yml` — runs on every PR: backend pytest, frontend Vitest, TypeScript type check, Docker build validation, E2E (mocked backend)
2. `docker-publish.yml` — runs on main push: builds and pushes to GitHub Container Registry

**Why:** A green CI badge is worth twice a project without one. The existing test infrastructure makes this straightforward.

**Effort:** M (2-3 hours)

**Pipeline jobs (parallel):**
```
backend-tests ─┐
               ├─► e2e-tests
frontend-tests ─┘

docker-build (runs independently)
```

**CI runtime target:** ~4-5 minutes per PR (warm Docker layer cache)

**Files:**
- New: `.github/workflows/ci.yml`
- New: `.github/workflows/docker-publish.yml`
- New: `playwright.config.ts`
- New: `e2e/gallery.spec.ts`, `e2e/classify.spec.ts`

---

### 1.10 WCAG 2.1 AA Compliance

**What:** Address specific identified gaps:
1. `prefers-reduced-motion` wrapper around all CSS animations (currently missing everywhere)
2. `aria-live="polite"` region in `DiagnosticReport` — screen readers get no announcement on classification complete
3. Roving `tabindex` in `GalleryGrid` — currently requires 24 Tab keypresses to move past the gallery
4. Color-only differentiation for Pneumonia/Normal badges (add SVG icon alongside color)
5. Skip-navigation link before the header

**Effort:** S/M

**Files:**
- Modified: `frontend/src/styles/globals.css`
- Modified: `frontend/src/components/gallery/GalleryGrid.tsx`
- Modified: `frontend/src/components/report/DiagnosticReport.tsx`
- Modified: `frontend/src/components/report/PredictionLabel.tsx`
- Modified: `frontend/src/App.tsx`

---

### 1.11 Design System Upgrade + Dark Mode

**What:**
- Overhaul `globals.css` token system: expanded color roles (semantic danger/success/warning), typographic scale (`--text-xs` through `--text-2xl`), radius scale, dark-mode-appropriate shadows
- Add `[data-theme="dark"]` override block — dark-mode-first clinical palette (slate-blue base)
- New `useTheme.ts` hook persisting preference to `localStorage`, respecting `prefers-color-scheme`
- `ThemeToggle` button in `Header`

**Why:** The token system was designed for this. Dark mode is expected for any technical portfolio in 2026, and medical imaging environments specifically benefit from dark interfaces.

**Effort:** S/M

**Files:**
- Modified: `frontend/src/styles/globals.css`
- New: `frontend/src/hooks/useTheme.ts`
- New: `frontend/src/components/shared/ThemeToggle.tsx`
- Modified: `frontend/src/components/layout/Header.tsx`

---

### 1.12 Confidence Gauge + Skeleton Screens

**What:**
- Replace `ConfidenceBar` with a `ConfidenceGauge` SVG arc — animates `stroke-dashoffset` on render, monospace percentage in center, color-coded by threshold
- Replace loading spinners with anatomically-accurate skeleton screens that match the exact layout they replace (gallery grid + report panel)

**Why:** The SVG gauge is the signature visual moment of the diagnostic report. Skeleton screens eliminate layout shift and communicate structure before data arrives. Both signal "shipped product" not "tutorial."

**Effort:** S/M

**Files:**
- New: `frontend/src/components/report/ConfidenceGauge.tsx`
- New: `frontend/src/components/gallery/GalleryGridSkeleton.tsx`
- New: `frontend/src/components/report/DiagnosticReportSkeleton.tsx`
- Retired: `GalleryLoader.tsx`

---

## Tier 2 — High Value, Deferred

These are worthwhile but require more design work or carry higher complexity.

### 2.1 Gallery Filter Bar

Filter gallery by class (All / NORMAL / PNEUMONIA) with per-class counts. Pure frontend, no backend changes. **Effort: S.**

### 2.2 Grad-CAM Opacity Slider + Side-by-Side Mode

`<input type="range">` controlling canvas `globalAlpha` for heatmap blend. Third tab option "Side by Side" expanding the container to `grid-template-columns: 1fr 1fr`. Fullscreen expand via `LightboxModal`. **Effort: M.**

### 2.3 PDF Export of Diagnostic Report

"Download Report" button generating PDF with `jsPDF` + `html2canvas`: original X-ray, heatmap overlay, prediction, confidence, metadata, timestamp, disclaimer. **Effort: M.**

### 2.4 Side-by-Side Image Comparison Mode

Select two gallery images simultaneously, display split-screen diagnostic reports with visual diff indicator. No backend changes — two sequential `/classify` calls. **Effort: M/L.**

### 2.5 Batch Classification (`/classify/batch`)

New endpoint accepting up to 10 images, running inference in parallel via thread pool. Frontend "Classify All" button. **Effort: M/L.**

### 2.6 Startup Optimization: Metadata JSON Cache

After `load_and_cache_gallery()` completes, serialize `_gallery_images` and `_dataset_stats` to `{GALLERY_CACHE_DIR}/metadata.json`. On subsequent startups, if the file and all referenced JPEGs exist, skip dataset download entirely. **Effort: S.**

### 2.7 Defer Stats Collection to Background Task

The class distribution stats currently iterate 5,216 training images at startup. Move to a background `asyncio.Task` that runs after `yield` in lifespan. Reduces cold-start time significantly. **Effort: S.**

### 2.8 WebSocket Progress Streaming

Replace silent loading spinner with a `/ws/classify` endpoint streaming intermediate events: `preprocessing` → `inference` → `gradcam` → `complete`. **Effort: L.**

---

## Tier 3 — Future / v3.0

| Feature | Why Deferred |
|---|---|
| Multi-disease detection (NIH CheXNet 14-label) | Requires new model, dataset pipeline, full UI redesign |
| Model ensemble + soft voting | 2× model memory, high latency unless GPU |
| Annotation / region marking tool | Changes conceptual model of the app |
| IndexedDB session history | Scope expansion; stateful UX needs careful design |
| HuggingFace Spaces / GPU deployment | Ongoing cost; infrastructure work |
| In-app fine-tuning with feedback loop | Requires storage, job queue, model versioning |

---

## Backend Test Gaps to Close in v2.0

The existing 61 tests are well-structured. These specific gaps were identified:

| Gap | File to create | Risk if untested |
|---|---|---|
| `reshape_transform` CLS token stripping and shape math | `test_gradcam_service.py` | Silent wrong heatmaps |
| Label normalization logic (`"bacteria"` → `"PNEUMONIA"` etc.) | `test_label_normalization.py` | Wrong predictions silently pass |
| `/health` 503 path when model/gallery not ready | Add to `test_api.py` | Health check behavior untested |
| `is_loaded()` guard clauses | Add to `test_api.py` | Safety gates untested |

**Target backend coverage: 85%** (excluding lifespan/config).

---

## E2E Test Flows (Playwright)

Five critical flows, all with mocked backend (no model download in CI):

1. **App loads and gallery renders** — 4 stub images, disclaimer always visible
2. **Selecting an image triggers classification** — loading state → result → disclaimer still visible
3. **Selecting second image cancels first** — stale result prevention (AbortController)
4. **API error renders error banner** — 500 response → `role="alert"` visible, no prediction data
5. **Gallery API failure shows error** — `/api/images` 500 → error in gallery, report shows placeholder

---

## Recommended Sprint Sequence

### Sprint 1 (Week 1–2): Maximum Demo Impact
1. Custom image upload (1.1)
2. Both-class probability display (1.2)
3. Prediction cache (1.3)
4. Inference quantization + dedup (1.4)
5. WCAG quick wins (1.10 — `prefers-reduced-motion`, live region)

### Sprint 2 (Week 3–4): ML Depth + Observability
6. Grad-CAM / predict split (1.5)
7. Attention rollout visualization (1.6)
8. Structured logging + `/metrics` (1.7)
9. Defer stats collection (2.7) + metadata JSON cache (2.6)

### Sprint 3 (Week 5–6): Quality + Polish
10. Frontend test suite (1.8)
11. CI/CD pipeline (1.9)
12. Design system + dark mode (1.11)
13. Confidence gauge + skeleton screens (1.12)
14. Full WCAG pass (1.10)

### Sprint 4 (Week 7–8): Tier 2 Selectivity
15. Gallery filter bar (2.1)
16. Grad-CAM opacity slider + side-by-side (2.2)
17. PDF export (2.3)

---

## Architecture Decisions

**No database for v2.0.** In-memory LRU cache is sufficient for classification results. IndexedDB history belongs in v3. A database before it's needed adds operational overhead without user-visible benefit.

**No Redux.** `AppContext.tsx` is well-structured. Refactor it to `useReducer` to handle the increased state surface (uploadedImage, comparedImage, batchResults) without adding a dependency.

**Keep the service-layer pattern.** New capabilities (`attention_service.py`, `cache_utils.py`, `metrics.py`) slot in without touching existing services. The seams are clean.

**All new `ClassifyResponse` fields are optional with defaults.** This preserves backward compatibility with any client that cached v1 schema.

**Use `asyncio.gather` + `run_in_executor` for parallel heatmap pipelines.** Once Grad-CAM and Attention Rollout both exist, run them concurrently. `run_in_executor` also unblocks the event loop during the CPU-bound ViT forward pass.

---

## Key Files Most Affected by v2.0

| File | Why |
|---|---|
| `backend/routes/classify.py` | Cache lookup, parallel dispatch, two-phase split — all changes converge here |
| `backend/services/model_service.py` | Quantization, both-class probability, `predict()` signature change |
| `backend/schemas/response.py` | All new response fields — must stay backward-compatible |
| `frontend/src/context/AppContext.tsx` | Every new frontend feature requires new state fields here |
| `frontend/src/components/report/GradCamOverlay.tsx` | Template for attention rollout tab addition |
| `frontend/src/styles/globals.css` | Token system overhaul propagates everywhere |
