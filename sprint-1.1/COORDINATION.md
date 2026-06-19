# Sprint 1.1 Coordination Document — Custom Image Upload

**Status:** Implementation in progress
**Backend changes needed:** ZERO — `POST /classify` already handles arbitrary file bytes.
**All work is frontend.**

---

## Critical Integration Risk

The highest-risk change is **widening `selectedImage`** in `AppContext.tsx` from `GalleryImage | null` to a union type that can represent either a gallery image or an upload. This cascades to:

- `ImageGallery.tsx` — highlight logic uses `.id`
- `DiagnosticReport.tsx` — `GradCamOverlay` uses `.url`
- `useClassify.ts` — calls `classifyImage(image.url)`

**Mitigation:** Keep gallery state completely separate from upload state. Do NOT widen `selectedImage`. Instead add parallel upload-specific fields to context so the two flows are fully independent.

---

## Recommended Implementation Order

1. `frontend/src/types/api.ts` — add any new types (UploadState)
2. `frontend/src/api/client.ts` — overload `classifyImage` to accept `File`
3. `frontend/src/context/AppContext.tsx` — add upload state fields (parallel to gallery, do not merge)
4. `frontend/src/hooks/useImageUpload.ts` — upload state machine
5. `frontend/src/components/upload/DropZone.tsx` — drag-drop UI
6. `frontend/src/components/gallery/ImageGallery.tsx` — wire DropZone
7. `frontend/src/components/report/DiagnosticReport.tsx` — handle upload result display
8. `frontend/src/styles/globals.css` — drop zone styles

---

## Contract Definitions

### AppContext additions (parallel, not replacing gallery state)

```typescript
// NEW — upload flow state (never conflicts with gallery state)
uploadedPreviewUrl: string | null    // object URL for preview thumbnail
uploadedResult: ClassifyResponse | null
isUploading: boolean
uploadError: string | null
// actions
setIsUploading: (v: boolean) => void
setUploadedResult: (result: ClassifyResponse | null, previewUrl: string | null) => void
setUploadError: (err: string | null) => void
clearUpload: () => void   // resets all upload fields; does NOT touch gallery state
```

### useImageUpload hook interface

```typescript
interface UseImageUploadReturn {
  uploadState: 'idle' | 'validating' | 'uploading' | 'success' | 'error'
  uploadedResult: ClassifyResponse | null
  uploadError: string | null
  uploadedPreviewUrl: string | null
  handleFileSelect: (file: File) => Promise<void>
  reset: () => void
}
```

### client.ts overload

```typescript
// When source is File: use directly as FormData value (no extra fetch)
// When source is string: existing behavior (fetch blob, then POST)
export async function classifyImage(
  source: string | File,
  signal?: AbortSignal
): Promise<ClassifyResponse>
```

### DropZone props

```typescript
interface DropZoneProps {
  onFile: (file: File) => void
  isUploading: boolean
  disabled?: boolean
}
```

---

## Integration Checklist (for QA + Debugger)

### Must work after 1.1

- [ ] Upload JPEG → classification result in report panel
- [ ] Upload PNG → classification result in report panel
- [ ] Drop zone shows drag-over state when file dragged over it
- [ ] Invalid format (GIF, etc.) → error shown, no upload
- [ ] File > 10 MB → error shown, no upload
- [ ] Network error → error shown with Retry
- [ ] Clicking gallery image while upload in flight → aborts upload, shows gallery result
- [ ] Uploading while gallery result showing → clears gallery result, shows upload result
- [ ] Object URLs revoked on component unmount
- [ ] Clinical disclaimer visible in all states

### Regression tests (existing gallery flow must be 100% unaffected)

- [ ] Gallery images load on startup
- [ ] Clicking gallery image triggers classification
- [ ] Gallery item shows selected state
- [ ] `isClassifying` state shows spinner during gallery classify
- [ ] `classifyError` state shows error banner on gallery classify failure
- [ ] `/health` polling unaffected
- [ ] Dataset info panel unaffected
- [ ] AbortController on gallery classify still works

### Edge cases

- [ ] 0-byte file → handled gracefully
- [ ] Corrupt image → backend 400 → error shown
- [ ] Double-click upload button → only one request in flight
- [ ] Upload immediately after upload → previous AbortController cancelled
- [ ] Very fast network (response before loading state renders) → no flicker
- [ ] Component unmount during upload → no state update after unmount

---

## Agent Handoff Notes

### For Fullstack Developer
**New files:** `useImageUpload.ts`, `DropZone.tsx`
**Modified files:** `client.ts`, `AppContext.tsx`, `ImageGallery.tsx`, `DiagnosticReport.tsx`, `globals.css`
**DO NOT modify:** `useClassify.ts`, `GalleryItem.tsx`, `GalleryGrid.tsx`, any backend file

### For Debugger (highest-risk paths)
1. Object URL lifecycle — `URL.createObjectURL` must be revoked in `useEffect` cleanup
2. AbortController interaction — upload abort must not affect gallery abort controller
3. Context state isolation — `clearUpload()` must never touch `selectedImage` or `classifyResult`
4. `classifyImage` overload — `source instanceof File` branch must not call `fetch(source)`
5. FormData construction — `form.append('file', file, file.name)` (name arg required for MIME type)

### For Code Reviewer (simplification targets)
- `useImageUpload` should delegate to `classifyImage` from `client.ts`, not re-implement the POST
- DropZone drag state can use a single `isDragOver: boolean` state, not an enum
- `clearUpload` in context should be a single dispatch, not multiple setters called in sequence
- CSS classes over inline styles — use `globals.css` tokens only

### For QA Expert
Test in this order: happy path JPEG → happy path PNG → client validation errors → server errors → gallery regression → accessibility → keyboard nav → memory leak check
