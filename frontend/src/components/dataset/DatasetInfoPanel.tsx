import { useDatasetInfo } from '../../hooks/useDatasetInfo'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ErrorBanner } from '../shared/ErrorBanner'

export function DatasetInfoPanel() {
  const { datasetInfo, loading, error } = useDatasetInfo()

  if (loading) return <LoadingSpinner text="Loading dataset info…" />
  if (error) return <ErrorBanner message={error} />
  if (!datasetInfo) return null

  const total = datasetInfo.class_distribution.NORMAL + datasetInfo.class_distribution.PNEUMONIA
  const normalPct = total > 0 ? (datasetInfo.class_distribution.NORMAL / total) * 100 : 0
  const pneumoniaPct = total > 0 ? (datasetInfo.class_distribution.PNEUMONIA / total) * 100 : 0

  return (
    <section
      aria-label="Dataset Information"
      style={{
        backgroundColor: 'var(--color-panel)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--spacing-lg)',
      }}
    >
      <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
        Dataset Information
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-xl)',
          alignItems: 'flex-start',
        }}
      >
        {/* Dataset name + link */}
        <div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Dataset
          </p>
          <a
            href={datasetInfo.hf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '14px', fontWeight: 500 }}
          >
            {datasetInfo.name} ↗
          </a>
        </div>

        {/* Split counts */}
        <div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            Splits
          </p>
          <p style={{ fontSize: '14px' }}>
            Train: {datasetInfo.train_count.toLocaleString()} &nbsp;·&nbsp;
            Test: {datasetInfo.test_count.toLocaleString()} &nbsp;·&nbsp;
            Val: {datasetInfo.validation_count.toLocaleString()}
          </p>
        </div>

        {/* Class distribution */}
        <div style={{ flexGrow: 1, minWidth: '200px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
            Class Distribution (Training Set)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Normal bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', width: '80px', color: 'var(--color-text-muted)' }}>
                NORMAL
              </span>
              <div
                style={{
                  flex: 1,
                  height: '14px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${normalPct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-success)',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', width: '50px', textAlign: 'right' }}>
                {datasetInfo.class_distribution.NORMAL.toLocaleString()}
              </span>
            </div>
            {/* Pneumonia bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', width: '80px', color: 'var(--color-text-muted)' }}>
                PNEUMONIA
              </span>
              <div
                style={{
                  flex: 1,
                  height: '14px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pneumoniaPct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-danger)',
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', width: '50px', textAlign: 'right' }}>
                {datasetInfo.class_distribution.PNEUMONIA.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
