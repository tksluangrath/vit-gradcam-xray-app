import { GalleryImage } from '../../types/api'

interface GalleryItemProps {
  image: GalleryImage
  isSelected: boolean
  onClick: () => void
}

export function GalleryItem({ image, isSelected, onClick }: GalleryItemProps) {
  const isPneumonia = image.label === 'PNEUMONIA'

  return (
    <>
      <style>{`
        .gallery-item {
          position: relative;
          padding: 0;
          border-radius: var(--radius);
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.15s ease, border-color 0.15s ease;
          background: none;
          width: 100%;
          aspect-ratio: 1;
        }
        .gallery-item:hover {
          transform: scale(1.02);
        }
        .gallery-item.selected {
          outline: 3px solid #0066cc;
          outline-offset: 2px;
        }
        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gallery-item-badge {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 3px 6px;
          font-size: 10px;
          font-weight: 600;
          text-align: center;
          color: white;
        }
      `}</style>
      <button
        className={`gallery-item${isSelected ? ' selected' : ''}`}
        onClick={onClick}
        aria-label={`Select ${image.label} X-ray image ${image.index + 1}`}
        aria-pressed={isSelected}
      >
        <img
          src={image.url}
          alt={`Chest X-ray ${image.index + 1} — ${image.label}`}
          loading="lazy"
        />
        <div
          className="gallery-item-badge"
          style={{ backgroundColor: isPneumonia ? 'var(--color-danger)' : 'var(--color-success)' }}
        >
          {image.label}
        </div>
      </button>
    </>
  )
}
