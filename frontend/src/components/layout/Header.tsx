export function Header() {
  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
        borderTop: '3px solid var(--color-accent)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-lg)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--color-accent)',
            lineHeight: 1,
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          ✚
        </span>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>
            Chest X-Ray Classifier
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Pneumonia Detection via Vision Transformer
          </p>
        </div>
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '3px 8px',
        }}
      >
        v1.0.0
      </span>
    </header>
  )
}
