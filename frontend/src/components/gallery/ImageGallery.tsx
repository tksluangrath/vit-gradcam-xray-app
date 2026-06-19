import { useGallery } from '../../hooks/useGallery'
import { useClassify } from '../../hooks/useClassify'
import { useImageUpload } from '../../hooks/useImageUpload'
import { useAppContext } from '../../context/AppContext'
import { GalleryImage } from '../../types/api'
import { GalleryGrid } from './GalleryGrid'
import { GalleryLoader } from './GalleryLoader'
import { ErrorBanner } from '../shared/ErrorBanner'
import { DropZone } from '../upload/DropZone'

export function ImageGallery() {
  const { images, loading, error } = useGallery()
  const { classify } = useClassify()
  const {
    selectedImage,
    setSelectedImage,
    setClassifyResult,
    setClassifyError,
    isUploading,
  } = useAppContext()
  const { handleFileSelect, uploadState, uploadError, reset: resetUpload, retry } = useImageUpload()

  const handleSelect = (img: GalleryImage) => {
    // Abort any in-flight upload and clear upload state so the gallery result takes priority
    resetUpload()
    setSelectedImage(img)
    void classify(img)
  }

  const handleFile = (file: File) => {
    // Clear gallery selection AND any stale gallery classify state so the upload
    // result takes full priority. Without clearing classifyError here, a previous
    // gallery failure would resurface in DiagnosticReport after the upload resets.
    setSelectedImage(null)
    setClassifyResult(null)
    setClassifyError(null)
    void handleFileSelect(file)
  }

  return (
    <section aria-label="Image Gallery">
      {/* Upload section */}
      <section aria-label="Upload your own X-ray" className="upload-section">
        <h2 className="gallery-section-heading">Upload Your Own X-Ray</h2>
        <DropZone onFile={handleFile} isUploading={isUploading} />
        {uploadState === 'error' && uploadError && (
          <div role="alert" aria-live="assertive" className="upload-error-banner">
            <p className="upload-error-text">{uploadError}</p>
            <button onClick={retry} className="upload-retry-btn">
              Retry
            </button>
          </div>
        )}
      </section>

      {/* Gallery section */}
      <h2 className="gallery-heading">
        Image Gallery
        {!loading && !error && (
          <span className="gallery-heading__count">({images.length} images)</span>
        )}
      </h2>

      {loading && <GalleryLoader />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && (
        <GalleryGrid
          images={images}
          selectedId={selectedImage?.id ?? null}
          onSelect={handleSelect}
        />
      )}
    </section>
  )
}
