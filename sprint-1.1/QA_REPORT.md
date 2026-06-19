# QA Report — Sprint 1.1 Custom Image Upload

## Summary

8 issues identified. 4 blocking issues now resolved. 4 non-blocking issues tracked.

| # | Severity | Description | Status |
|---|---|---|---|
| 1 | **Blocking** | Race condition: `clearUpload()` in `handleSelect` didn't abort upload AbortController | **Fixed** |
| 2 | — | _(merged into Issue 5 analysis)_ | — |
| 3 | **Blocking** | `useImageUpload` unmount cleanup didn't abort in-flight request | **Fixed** |
| 4 | **Blocking** | No Retry action for network errors (violated Acceptance Criterion 6) | **Fixed** |
| 5 | **Blocking** | Stale `classifyError` resurfaces after upload-reset cycle | **Fixed** (debugger) |
| 6 | Minor | `color-mix()` missing browser fallback | **Fixed** (code review) |
| 7 | Minor | Axios `Content-Type` must not be set manually (breaks multipart boundary) | **Fixed** (code review) |
| 8 | Minor | `LoadingSpinner` lacks `role="status"` / `aria-live` (pre-existing) | Open |

---

## Issue 1 — Race condition in `handleSelect` (FIXED)

**Severity:** Blocking

**Root cause:** `ImageGallery.handleSelect` called `clearUpload()` from `AppContext`, which resets context state but does NOT call `abortControllerRef.current.abort()`. If an upload was in flight when the user clicked a gallery image, the upload could complete after the abort, then write its result over the gallery result.

**Fix applied to `frontend/src/components/gallery/ImageGallery.tsx`:**
- Replaced `clearUpload()` with `resetUpload()` (aliased from `useImageUpload().reset`)
- `reset()` first aborts the AbortController, then revokes any object URL, then calls `clearUpload()`
- Removed now-unused `clearUpload` from the `useAppContext()` destructure

---

## Issue 3 — Unmount doesn't abort in-flight request (FIXED)

**Severity:** Blocking

**Root cause:** The `useEffect` cleanup in `useImageUpload.ts` only revoked the object URL on unmount. It did not call `abortControllerRef.current?.abort()`. If the component unmounted while an upload was in flight (e.g., route change), the async chain would continue and attempt to call `setIsUploading`, `setUploadedResult`, etc. on unmounted state — potentially causing React "can't perform state update on unmounted component" warnings and stale context state.

**Fix applied to `frontend/src/hooks/useImageUpload.ts`:**
```typescript
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort()   // ← added
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }
}, [])
```

---

## Issue 4 — No Retry action for network errors (FIXED)

**Severity:** Blocking — direct violation of Acceptance Criterion 6: "On network error, an inline error message with a Retry action is shown."

**Root cause:** The error UI was a bare `<p>` tag with no button.

**Fix applied:**

**`frontend/src/hooks/useImageUpload.ts`:**
- Added `lastFileRef` to store the most recently submitted `File`
- Added `retry` callback: re-calls `handleFileSelect(lastFileRef.current)` if a file was previously submitted
- `reset()` clears `lastFileRef.current` so retry is not available after a manual reset
- `retry` exported from `UseImageUploadReturn`

**`frontend/src/components/gallery/ImageGallery.tsx`:**
- Destructured `retry` from `useImageUpload()`
- Replaced bare `<p role="alert">` with `<div role="alert">` containing error text + Retry button

**`frontend/src/styles/globals.css`:**
- Added `.upload-error-banner` (flex row, aligns message + button)
- Added `.upload-retry-btn` (accent-bordered button, fills accent on hover)

---

## Issue 5 — Stale `classifyError` resurfaces after upload-reset (FIXED)

**Severity:** Blocking — fixed in prior debugger pass.

**Fix:** `handleFile` in `ImageGallery.tsx` calls `setClassifyResult(null)` and `setClassifyError(null)` before `handleFileSelect`, preventing stale gallery error state from resurfacing after upload + reset cycle.

---

## Issue 8 — `LoadingSpinner` accessibility (Open)

**Severity:** Minor / pre-existing

`LoadingSpinner` renders a `<div>` with visible text but no `role="status"` or `aria-live="polite"`. Screen readers may not announce the loading state change. This is pre-existing and out of scope for Sprint 1.1.

**Recommendation:** Add `role="status"` and `aria-live="polite"` to the spinner wrapper in a follow-up ticket.

---

## Acceptance Criteria Verification

| AC | Description | Result |
|---|---|---|
| 1 | DropZone accepts JPEG/PNG drag-and-drop | Pass |
| 2 | DropZone accepts click-to-browse file picker | Pass |
| 3 | Keyboard accessible (Enter/Space triggers picker) | Pass |
| 4 | Client-side validation: unsupported type → inline error | Pass |
| 5 | Client-side validation: file > 10 MB → inline error | Pass |
| 6 | Network error → inline error with Retry action | **Pass** (fixed Issue #4) |
| 7 | Upload result displayed in DiagnosticReport | Pass |
| 8 | Gallery selection clears upload result and vice versa | **Pass** (fixed Issue #1) |
| 9 | In-flight upload aborted on navigation/unmount | **Pass** (fixed Issue #3) |
| 10 | No object URL memory leaks | Pass |

---

## Test Scenarios for Manual Verification

1. **Happy path:** Drop valid JPEG → loading spinner → classification result appears in DiagnosticReport
2. **File type rejection:** Drop a `.gif` → error banner "Only JPEG and PNG images are supported." appears inline; no network request
3. **File size rejection:** Drop a file > 10 MB → error banner "File is too large (max 10 MB)." appears inline; no network request
4. **Retry flow:** Trigger a network error (disable backend) → error banner + Retry button appear → re-enable backend → click Retry → classification succeeds
5. **Gallery switch while uploading:** Start a large file upload → immediately click a gallery image → gallery result appears (upload does not overwrite); verify no console error about setState on unmounted component
6. **Upload-reset-gallery-error cycle:** Classify gallery image (force failure) → drop file → upload succeeds → reset upload → verify no stale error banner appears
7. **Keyboard navigation:** Tab to DropZone → press Enter → file picker opens
8. **Reduced motion:** Prefers-reduced-motion: verify DropZone transitions are disabled
