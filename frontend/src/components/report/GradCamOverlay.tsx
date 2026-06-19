import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

type ActiveTab = 'original' | 'heatmap'

interface GradCamOverlayProps {
  originalSrc: string
  heatmapB64: string
}

export function GradCamOverlay({ originalSrc, heatmapB64 }: GradCamOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [compositing, setCompositing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('heatmap')

  useEffect(() => {
    if (!heatmapB64) return
    const canvas = canvasRef.current
    if (!canvas) return

    setCompositing(true)
    setError(null)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Canvas not supported')
      setCompositing(false)
      return
    }

    const original = new Image()
    const heatmap = new Image()
    original.crossOrigin = 'anonymous'

    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded < 2) return
      canvas.width = 224
      canvas.height = 224
      ctx.globalAlpha = 1.0
      ctx.drawImage(original, 0, 0, 224, 224)
      ctx.globalAlpha = 0.4
      ctx.drawImage(heatmap, 0, 0, 224, 224)
      ctx.globalAlpha = 1.0
      setCompositing(false)
    }

    const onError = () => {
      setError('Failed to load overlay images')
      setCompositing(false)
    }

    original.onload = onLoad
    heatmap.onload = onLoad
    original.onerror = onError
    heatmap.onerror = onError

    original.src = originalSrc
    heatmap.src = heatmapB64

    return () => {
      original.onload = null
      heatmap.onload = null
      original.onerror = null
      heatmap.onerror = null
      original.src = ''
      heatmap.src = ''
    }
  }, [originalSrc, heatmapB64])

  const tabBase: CSSProperties = {
    padding: '7px 20px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    letterSpacing: '0.02em',
  }

  const activeTabStyle: CSSProperties = {
    ...tabBase,
    backgroundColor: '#ffffff',
    color: 'var(--color-text)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
  }

  const inactiveTabStyle: CSSProperties = {
    ...tabBase,
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
  }

  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Grad-CAM Visualization
      </p>

      {/* Tab bar */}
      <div
        style={{
          display: 'inline-flex',
          backgroundColor: '#e9ecef',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '14px',
          gap: '4px',
        }}
        role="tablist"
        aria-label="Visualization view"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'original'}
          style={activeTab === 'original' ? activeTabStyle : inactiveTabStyle}
          onClick={() => setActiveTab('original')}
        >
          Original
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'heatmap'}
          style={activeTab === 'heatmap' ? activeTabStyle : inactiveTabStyle}
          onClick={() => setActiveTab('heatmap')}
        >
          Heatmap Overlay
        </button>
      </div>

      {/* Image area */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          backgroundColor: '#000',
        }}
      >
        {/* Original tab */}
        <img
          src={originalSrc}
          alt="Original chest X-ray"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: activeTab === 'original' ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: activeTab === 'original' ? 'auto' : 'none',
          }}
        />

        {/* Heatmap loading message */}
        {compositing && activeTab === 'heatmap' && (
          <p
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.7)',
              margin: 0,
            }}
          >
            Rendering heatmap…
          </p>
        )}
        {error && (
          <p
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: 'var(--color-danger)',
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {/* Heatmap canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: activeTab === 'heatmap' && !compositing && !error ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: activeTab === 'heatmap' ? 'auto' : 'none',
          }}
          aria-label="Grad-CAM heatmap overlaid on chest X-ray"
        />
      </div>

      {/* Color legend — shown on heatmap tab */}
      <div
        style={{
          opacity: activeTab === 'heatmap' ? 1 : 0,
          transition: 'opacity 0.25s ease',
          marginTop: '12px',
          pointerEvents: activeTab === 'heatmap' ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            height: '10px',
            borderRadius: '5px',
            background: 'linear-gradient(to right, #000080, #0000ff, #00ffff, #ffff00, #ffffff)',
            marginBottom: '4px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>Low activation</span>
          <span>High activation</span>
        </div>
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          Bright regions indicate areas that most influenced the prediction
        </p>
      </div>
    </div>
  )
}
