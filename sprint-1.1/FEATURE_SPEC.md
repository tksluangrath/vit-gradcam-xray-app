---
noteId: "13e18700232711f1884e0917dd4ae7f4"
tags: []

---

# Feature 1.1 — Custom Image Upload

## Feature Overview

Allows users to upload their own chest X-ray JPEG/PNG images directly, extending beyond the curated gallery. The file is classified by the same ViT + Grad-CAM pipeline. **Zero backend changes required** — `POST /classify` already handles arbitrary file bytes.

## User Story

As a medical student or educator, I want to upload my own X-ray images so I can test the model on custom data and compare results against known diagnoses.

---

## Acceptance Criteria

1. A `DropZone` component is visible above the gallery grid; accepts drag-and-drop and click-to-browse.
2. Only JPEG and PNG are accepted; other formats show a user-facing error before upload.
3. Files > 10 MB are rejected client-side with a clear error message.
4. A loading state ("Classifying...") is shown while the POST is in flight.
5. The diagnostic report panel populates with label, confidence, heatmap, and metadata on success.
6. Errors (network, 4xx, 5xx) show a clear message with a Retry action.
7. Uploading a custom image clears the gallery selection; clicking a gallery image clears the upload.
8. The clinical disclaimer remains visible in every state.
9. All interactive elements are keyboard-accessible (Tab, Enter/Space); errors announced via `aria-live`.
10. Object URLs created for preview are revoked on cleanup to prevent memory leaks.

---

## Component Architecture

```
ImageGallery.tsx (modified)
├── "Upload Your Own X-Ray" section header
├── DropZone.tsx (NEW)         ← drag-drop / file-picker
└── GalleryGrid.tsx (unchanged)

AppContext.tsx (modified)
├── uploadedPreviewUrl: string | null
├── uploadedResult: ClassifyResponse | null
├── isUploading: boolean
├── uploadError: string | null
└── clearUpload(): void

hooks/useImageUpload.ts (NEW)
└── state machine: idle → validating → uploading → success/error

api/client.ts (modified)
└── classifyImage(source: string | File, signal?) — overloaded
```

---

## Upload State Machine

```
[idle]
  ↓ file selected / dropped
[validating]  (check type + size client-side)
  ├──✗──► [error]  (invalid type or size > 10 MB)
  └──✓──► [uploading]  (POST /api/classify in flight)
              ├──✗──► [error]  (network / 4xx / 5xx)
              └──✓──► [success]  (ClassifyResponse received)
```

---

## API Contract

### `frontend/src/api/client.ts`

```typescript
// Overloaded — when source is a File, skip the URL-fetch step
export async function classifyImage(
  source: string | File,
  signal?: AbortSignal
): Promise<ClassifyResponse>
```

When `source instanceof File`: use File directly as FormData value.
When `source` is a string (URL): existing behavior — fetch blob, then POST.

### Backend

**No changes.** `POST /classify` already:
- Accepts multipart/form-data `file`
- Validates JPEG/PNG via `image_utils.validate_and_resize()`
- Returns `ClassifyResponse { label, confidence, heatmap_b64, region_detected, model_metadata }`

---

## Validation Rules

| Rule | Where | Error Message |
|---|---|---|
| File type is JPEG or PNG | Client (MIME check) | "Only JPEG and PNG images are supported." |
| File size ≤ 10 MB | Client (`file.size`) | "File is too large (max 10 MB)." |
| Image is readable | Server (PIL) | "Could not read image. Ensure the file is a valid JPEG or PNG." |
| Format is JPEG/PNG | Server | "Unsupported image format. Only JPEG and PNG are accepted." |

---

## Accessibility Requirements

- `DropZone` outer div: `role="button"`, `tabIndex={0}`, `aria-label="Upload chest X-ray image"`, `onKeyDown` triggers click on Enter/Space
- Hidden `<input type="file" accept="image/jpeg,image/png">` associated via `htmlFor`/`id`
- Loading state: `role="status"`, `aria-live="polite"`
- Errors: `role="alert"`, `aria-live="assertive"`
- `prefers-reduced-motion`: no transitions if user prefers reduced motion

---

## Out of Scope (v1.1)

- Server-side image storage (images discarded after classification)
- Upload history or session persistence
- Batch / multi-file upload
- Image editing or cropping tools
- Rate limiting per user

---

## Testing Checklist

- [ ] Upload valid JPEG → classification result appears
- [ ] Upload valid PNG → classification result appears
- [ ] Upload GIF → error message, no upload
- [ ] Upload JPEG > 10 MB → error message, no upload
- [ ] Gallery click after upload → clears upload state, shows gallery result
- [ ] Upload after gallery selection → clears gallery selection
- [ ] Drag-and-drop JPEG onto DropZone → same as click flow
- [ ] Keyboard: Tab → DropZone, Enter → opens file picker
- [ ] Screen reader: error announced on invalid file
- [ ] Network offline → error message with Retry
- [ ] Rapid double-click → only one request in flight at a time
- [ ] Object URLs revoked after component unmount (no memory leak)
