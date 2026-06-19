import { GalleryImage } from '../../types/api'
import { GalleryItem } from './GalleryItem'

interface GalleryGridProps {
  images: GalleryImage[]
  selectedId: string | null
  onSelect: (img: GalleryImage) => void
}

export function GalleryGrid({ images, selectedId, onSelect }: GalleryGridProps) {
  return (
    <>
      <style>{`
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-sm);
        }
        @media (max-width: 600px) {
          .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
      <div className="gallery-grid" role="list" aria-label="X-ray image gallery">
        {images.map((image) => (
          <div key={image.id} role="listitem">
            <GalleryItem
              image={image}
              isSelected={image.id === selectedId}
              onClick={() => onSelect(image)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
