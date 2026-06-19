# Debug Report — Sprint 1.1 Custom Image Upload

## Summary

5 risk areas analyzed. 1 confirmed bug found and fixed.

| Risk Area | Status | Severity |
|---|---|---|
| Object URL memory leaks | No issues | — |
| AbortController misuse | No issues | — |
| Context state isolation | No issues | — |
| FormData construction | No issues | — |
| DiagnosticReport priority logic | **1 bug fixed** | Medium |

---

## Risk Area 1 — Object URL Memory Leaks: CLEAR

The implementation is correct on all axes:
- `URL.createObjectURL` result stored in BOTH `previewUrlRef.current` (for revocation) AND `previewUrl` state (for rendering)
- Revocation via ref only — never via state variable
- Revoked on: new file selected (line 48-51), `reset()` call (lines 116-119), component unmount (`useEffect` cleanup lines 33-40)
- Rapid double-call safety: second `handleFileSelect` call revokes the first URL via ref before creating new one

---

## Risk Area 2 — AbortController Misuse: CLEAR

- `finally` block guards with `!controller.signal.aborted` where `controller` is the per-invocation local variable, not `abortControllerRef.current`. Correctly skips `setIsUploading(false)` when aborted.
- `catch` block returns early on `controller.signal.aborted` — no stale error state written.
- Upload and gallery abort controllers are entirely separate refs in separate hook instances — no interference possible.

---

## Risk Area 3 — Context State Isolation: CLEAR

`clearUpload()` in `AppContext.tsx` touches exactly: `uploadedResultState`, `uploadedPreviewUrl`, `isUploading`, `uploadError`. The comment in the source explicitly documents that `selectedImage`, `classifyResult`, `isClassifying`, and `classifyError` are intentionally excluded.

---

## Risk Area 4 — FormData Construction: CLEAR

`filename = source.name` when source is a `File`. The backend (`classify.py` → `image_utils.py`) uses PIL `Image.open(io.BytesIO(bytes))` which detects format from magic bytes, not filename. The filename field in FormData is irrelevant to backend correctness.

---

## Risk Area 5 — DiagnosticReport Priority Logic

### 5.1 `isClassifying` + `isUploading` simultaneously: CLEAR
The two flows are mutually exclusive by construction:
- Gallery path: `clearUpload()` sets `isUploading=false` before `classify()` sets `isClassifying=true`
- Upload path: never touches `isClassifying`

### 5.2 `uploadError` vs stale `classifyResult`: CLEAR
The `activeError = uploadError ?? classifyError` expression returns early before reaching the `uploadedResult` / `classifyResult` branches. Upload error correctly takes priority.

### 5.3 `hasActivity` during validation failure: CLEAR
When validation fails: `isUploading=false`, `uploadedResult=null`, `selectedImage=null` → `hasActivity=false`. But `uploadError` is set, so the `activeError` guard fires first. The `hasActivity` guard is never evaluated.

### 5.4 CONFIRMED BUG — Stale `classifyError` after upload-reset cycle

**Severity:** Medium

**Root cause:** `handleFile` in `ImageGallery.tsx` called `setSelectedImage(null)` but did NOT clear `classifyResult` or `classifyError`.

**Failure scenario:**
1. User classifies gallery image → it fails → `classifyError = "Classification failed."`
2. User drops a file → `handleFile` clears `selectedImage` but NOT `classifyError`
3. Upload succeeds → report shows upload result (upload branch fires before gallery branch)
4. User resets upload → `clearUpload()` clears upload state
5. Now: `selectedImage=null`, `classifyResult=null`, `uploadedResult=null`, `uploadError=null` — but `classifyError="Classification failed."` is still live
6. `DiagnosticReport` renders: `activeError = null ?? "Classification failed."` → **stale ErrorBanner appears**

**Fix applied to `frontend/src/components/gallery/ImageGallery.tsx`:**
```typescript
const handleFile = (file: File) => {
  setSelectedImage(null)
  setClassifyResult(null)   // ← added
  setClassifyError(null)    // ← added: prevents stale error resurfacing after upload reset
  void handleFileSelect(file)
}
```

---

## Prevention Recommendations

1. **Add `clearGalleryState()` helper to context** that resets `selectedImage`, `classifyResult`, and `classifyError` atomically — mirrors `clearUpload()` for symmetry.
2. **Add a cross-flow integration test:** gallery classify failure → drop file → upload success → reset upload → verify no error banner visible.
3. **Add invariant comment in `DiagnosticReport.tsx`** before the `activeError` block documenting that errors should only be present from the most recently active flow.
