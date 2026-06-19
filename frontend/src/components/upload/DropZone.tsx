import { useRef, useState, DragEvent, ChangeEvent, KeyboardEvent } from 'react'
import { LoadingSpinner } from '../shared/LoadingSpinner'

interface DropZoneProps {
  onFile: (file: File) => void
  isUploading: boolean
  disabled?: boolean
}

export function DropZone({ onFile, isUploading, disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled && !isUploading) setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled || isUploading) return
    const files = e.dataTransfer?.files
    if (files && files.length > 0) onFile(files[0])
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
      // Reset input so the same file can be re-selected after an error
      e.target.value = ''
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const containerClass = [
    'drop-zone',
    isDragOver && !isUploading ? 'drop-zone--drag-over' : '',
    isUploading ? 'drop-zone--uploading' : '',
    disabled ? 'drop-zone--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={containerClass}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload chest X-ray image"
      aria-disabled={disabled || isUploading}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onClick={() => !disabled && !isUploading && inputRef.current?.click()}
    >
      {/* Visually hidden file input — accessible via label association and programmatic click */}
      <input
        ref={inputRef}
        id="xray-upload-input"
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="visually-hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {isUploading ? (
        <LoadingSpinner text="Classifying…" />
      ) : (
        <>
          {/* Cloud upload icon */}
          <svg
            className="drop-zone__icon"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>

          <span className="drop-zone__label">
            {isDragOver ? 'Release to upload' : 'Drop a chest X-ray here or click to browse'}
          </span>
          <span className="drop-zone__hint">JPEG or PNG · max 10 MB</span>
        </>
      )}
    </div>
  )
}
