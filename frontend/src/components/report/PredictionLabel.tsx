interface PredictionLabelProps {
  label: string
}

export function PredictionLabel({ label }: PredictionLabelProps) {
  const isPneumonia = label === 'PNEUMONIA'
  const icon = isPneumonia ? '⚠️' : '✓'
  const subtext = isPneumonia
    ? 'Pneumonia Detected — Consult a physician'
    : 'No Pneumonia Detected'

  return (
    <>
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.45); }
          50%       { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
        }
        .prediction-badge--pneumonia {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
        <span
          className={isPneumonia ? 'prediction-badge--pneumonia' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '24px',
            fontWeight: 700,
            color: 'white',
            backgroundColor: isPneumonia ? 'var(--color-danger)' : 'var(--color-success)',
            borderRadius: '10px',
            padding: '14px 28px',
            letterSpacing: '0.05em',
          }}
        >
          <span style={{ fontSize: '22px' }} aria-hidden="true">{icon}</span>
          {label}
        </span>
        <p
          style={{
            marginTop: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: isPneumonia ? 'var(--color-danger)' : 'var(--color-success)',
          }}
        >
          {subtext}
        </p>
      </div>
    </>
  )
}
