import { useEffect, useState } from 'react'
import { fetchGallery } from '../api/client'
import { GalleryImage } from '../types/api'

interface UseGalleryResult {
  images: GalleryImage[]
  loading: boolean
  error: string | null
}

export function useGallery(): UseGalleryResult {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchGallery()
      .then((response) => {
        if (!cancelled) {
          setImages(response.images)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load gallery'
          setError(message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { images, loading, error }
}
