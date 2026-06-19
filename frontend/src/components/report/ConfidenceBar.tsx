interface ConfidenceBarProps {
  confidence: number // 0-1
}

function getBarColor(confidence: number): string {
  if (confidence >= 0.8) return 'var(--color-success)'
  if (confidence >= 0.5) return '#f59e0b'
  return 'var(--color-danger)'
}

export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const pct = Math.round(confidence * 1000) / 10
  const color = getBarColor(confidence)

  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          Confidence
        </span>
        <span style={{ fontSize: '20px', fontWeight: 700, color }}>
          {pct.toFixed(1)}%
        </span>
      </div>

      <div
        style={{
          height: '14px',
          backgroundColor: '#e9ecef',
          borderRadius: '7px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: '7px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: '4px',
          paddingLeft: '25%',
          paddingRight: '0',
        }}
      >
        {(['25%', '50%', '75%'] as const).map((tick) => (
          <span
            key={tick}
            style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  )
}
