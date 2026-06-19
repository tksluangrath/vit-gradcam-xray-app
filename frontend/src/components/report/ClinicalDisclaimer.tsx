export function ClinicalDisclaimer() {
  return (
    <div
      role="note"
      aria-label="Clinical disclaimer"
      style={{
        backgroundColor: 'var(--color-warning-bg)',
        border: '1px solid var(--color-warning-border)',
        borderRadius: 'var(--radius)',
        color: 'var(--color-warning-text)',
        padding: 'var(--spacing-md)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginTop: 'var(--spacing-md)',
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '16px' }}>⚠</span>
      <p>
        This tool is for educational purposes only and is not a substitute for professional medical diagnosis.
      </p>
    </div>
  )
}
