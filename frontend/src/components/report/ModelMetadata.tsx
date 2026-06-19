import { ModelMetadata as ModelMetadataType } from '../../types/api'

interface ModelMetadataProps {
  metadata: ModelMetadataType
}

export function ModelMetadata({ metadata }: ModelMetadataProps) {
  const rows: [string, string][] = [
    ['Model', metadata.model_id],
    ['Dataset', metadata.dataset],
    ['Version', metadata.version],
    ['Framework', metadata.framework],
  ]

  return (
    <div
      style={{
        backgroundColor: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-md)',
      }}
    >
      <h3
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
        }}
      >
        Model Information
      </h3>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px' }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {label}
            </dt>
            <dd style={{ fontSize: '13px', color: 'var(--color-text)', wordBreak: 'break-all' }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
