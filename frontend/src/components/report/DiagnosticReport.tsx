import { useAppContext } from '../../context/AppContext'
import { PredictionLabel } from './PredictionLabel'
import { ConfidenceBar } from './ConfidenceBar'
import { GradCamOverlay } from './GradCamOverlay'
import { ModelMetadata } from './ModelMetadata'
import { ClinicalDisclaimer } from './ClinicalDisclaimer'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ErrorBanner } from '../shared/ErrorBanner'

const panelStyle = {
  backgroundColor: 'var(--color-panel)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  padding: 'var(--spacing-lg)',
  minHeight: '400px',
}

const titleStyle = { fontSize: '16px', fontWeight: 600, marginBottom: 'var(--spacing-md)' }

export function DiagnosticReport() {
  const {
    // Gallery flow
    selectedImage,
    classifyResult,
    isClassifying,
    classifyError,
    // Upload flow
    uploadedResult,
    uploadedPreviewUrl,
    isUploading,
    uploadError,
  } = useAppContext()

  const hasActivity = selectedImage !== null || isUploading || uploadedResult !== null

  // --- Loading state (either flow) ---
  if (isClassifying || isUploading) {
    return (
      <section aria-label="Diagnostic Report" style={panelStyle}>
        <h2 style={titleStyle}>Diagnostic Report</h2>
        <LoadingSpinner text="Analyzing image…" />
        <ClinicalDisclaimer />
      </section>
    )
  }

  // --- Error state (upload takes priority if both somehow set) ---
  const activeError = uploadError ?? classifyError
  if (activeError) {
    return (
      <section aria-label="Diagnostic Report" style={panelStyle}>
        <h2 style={titleStyle}>Diagnostic Report</h2>
        <ErrorBanner message={activeError} />
        <ClinicalDisclaimer />
      </section>
    )
  }

  // --- Upload result ---
  if (uploadedResult) {
    return (
      <section aria-label="Diagnostic Report" style={panelStyle}>
        <h2 style={titleStyle}>Diagnostic Report</h2>
        <PredictionLabel label={uploadedResult.label} />
        <ConfidenceBar confidence={uploadedResult.confidence} />
        {uploadedResult.heatmap_b64 && uploadedPreviewUrl && (
          <GradCamOverlay
            originalSrc={uploadedPreviewUrl}
            heatmapB64={uploadedResult.heatmap_b64}
          />
        )}
        <ModelMetadata metadata={uploadedResult.model_metadata} />
        <ClinicalDisclaimer />
      </section>
    )
  }

  // --- Gallery result ---
  if (classifyResult && selectedImage) {
    return (
      <section aria-label="Diagnostic Report" style={panelStyle}>
        <h2 style={titleStyle}>Diagnostic Report</h2>
        <PredictionLabel label={classifyResult.label} />
        <ConfidenceBar confidence={classifyResult.confidence} />
        {classifyResult.heatmap_b64 && (
          <GradCamOverlay
            originalSrc={selectedImage.url}
            heatmapB64={classifyResult.heatmap_b64}
          />
        )}
        <ModelMetadata metadata={classifyResult.model_metadata} />
        <ClinicalDisclaimer />
      </section>
    )
  }

  // --- Empty / no selection ---
  return (
    <section aria-label="Diagnostic Report" style={panelStyle}>
      <h2 style={titleStyle}>Diagnostic Report</h2>
      {!hasActivity && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '300px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '15px' }}>
            Select an image from the gallery or upload your own to begin classification
          </p>
        </div>
      )}
      <ClinicalDisclaimer />
    </section>
  )
}
