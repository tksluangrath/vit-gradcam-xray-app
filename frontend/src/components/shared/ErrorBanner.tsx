interface ErrorBannerProps {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c2c7',
        borderRadius: 'var(--radius)',
        color: '#842029',
        padding: 'var(--spacing-md)',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>✕</span>
      <span>{message}</span>
    </div>
  )
}
