interface LoadingSpinnerProps {
  text?: string
}

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{text}</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
