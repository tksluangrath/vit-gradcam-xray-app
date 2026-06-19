export function GalleryLoader() {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .skeleton {
          background-color: var(--color-panel);
          border-radius: var(--radius);
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-sm);
        }
        @media (max-width: 600px) {
          .skeleton-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <div className="skeleton-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ aspectRatio: '1', width: '100%' }}
          />
        ))}
      </div>
    </>
  )
}
