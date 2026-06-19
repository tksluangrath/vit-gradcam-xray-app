import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { classifyImage } from '../api/client'
import { ClassifyResponse } from '../types/api'

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

interface UseImageUploadReturn {
  uploadState: UploadState
  uploadedResult: ClassifyResponse | null
  uploadError: string | null
  uploadedPreviewUrl: string | null
  handleFileSelect: (file: File) => Promise<void>
  reset: () => void
  retry: () => void
}

export function useImageUpload(): UseImageUploadReturn {
  const { setIsUploading, setUploadedResult, setUploadError, clearUpload } = useAppContext()

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localResult, setLocalResult] = useState<ClassifyResponse | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  // Track the current object URL so we can revoke it reliably
  const previewUrlRef = useRef<string | null>(null)
  // Store the last file so retry() can re-submit it
  const lastFileRef = useRef<File | null>(null)

  // Abort any in-flight request and revoke object URL on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }
  }, [])

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Cancel any in-flight request
      abortControllerRef.current?.abort()

      // Revoke the previous preview URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
        setPreviewUrl(null)
      }

      // Record file for retry
      lastFileRef.current = file

      // --- Client-side validation ---
      setUploadState('validating')
      setLocalError(null)
      setUploadError(null)

      if (!ACCEPTED_TYPES.includes(file.type)) {
        const msg = 'Only JPEG and PNG images are supported.'
        setUploadState('error')
        setLocalError(msg)
        setUploadError(msg)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        const msg = 'File is too large (max 10 MB).'
        setUploadState('error')
        setLocalError(msg)
        setUploadError(msg)
        return
      }

      // Create preview URL for display
      const objectUrl = URL.createObjectURL(file)
      previewUrlRef.current = objectUrl
      setPreviewUrl(objectUrl)

      // --- Upload ---
      setUploadState('uploading')
      setIsUploading(true)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const result = await classifyImage(file, controller.signal)
        if (controller.signal.aborted) return

        setLocalResult(result)
        setUploadedResult(result, objectUrl)
        setUploadState('success')
      } catch (err: unknown) {
        if (controller.signal.aborted) return

        const msg =
          err instanceof Error
            ? err.message
            : 'Upload failed. Please check your connection and try again.'
        setUploadState('error')
        setLocalError(msg)
        setUploadError(msg)
      } finally {
        if (!controller.signal.aborted) {
          setIsUploading(false)
        }
      }
    },
    [setIsUploading, setUploadedResult, setUploadError],
  )

  const reset = useCallback(() => {
    abortControllerRef.current?.abort()

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    lastFileRef.current = null
    setUploadState('idle')
    setLocalError(null)
    setLocalResult(null)
    setPreviewUrl(null)
    clearUpload()
  }, [clearUpload])

  const retry = useCallback(() => {
    if (lastFileRef.current) {
      void handleFileSelect(lastFileRef.current)
    }
  }, [handleFileSelect])

  return {
    uploadState,
    uploadedResult: localResult,
    uploadError: localError,
    uploadedPreviewUrl: previewUrl,
    handleFileSelect,
    reset,
    retry,
  }
}
