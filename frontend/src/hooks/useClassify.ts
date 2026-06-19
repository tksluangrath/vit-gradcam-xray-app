import { useRef } from 'react'
import { classifyImage } from '../api/client'
import { GalleryImage } from '../types/api'
import { useAppContext } from '../context/AppContext'

interface UseClassifyResult {
  classify: (image: GalleryImage) => Promise<void>
}

export function useClassify(): UseClassifyResult {
  const { setClassifyResult, setIsClassifying, setClassifyError } = useAppContext()
  const abortControllerRef = useRef<AbortController | null>(null)

  const classify = async (image: GalleryImage): Promise<void> => {
    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsClassifying(true)
    setClassifyError(null)
    setClassifyResult(null)

    try {
      const result = await classifyImage(image.url, controller.signal)
      if (!controller.signal.aborted) {
        setClassifyResult(result)
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Classification failed. Please try again.'
      setClassifyError(message)
    } finally {
      if (!controller.signal.aborted) {
        setIsClassifying(false)
      }
    }
  }

  return { classify }
}
