import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { ClassifyResponse, GalleryImage } from '../types/api'

interface AppContextValue {
  // Gallery flow (unchanged)
  selectedImage: GalleryImage | null
  setSelectedImage: (img: GalleryImage | null) => void
  classifyResult: ClassifyResponse | null
  setClassifyResult: (result: ClassifyResponse | null) => void
  isClassifying: boolean
  setIsClassifying: (loading: boolean) => void
  classifyError: string | null
  setClassifyError: (err: string | null) => void

  // Upload flow (parallel — never conflicts with gallery state)
  uploadedPreviewUrl: string | null
  uploadedResult: ClassifyResponse | null
  isUploading: boolean
  uploadError: string | null
  setIsUploading: (v: boolean) => void
  setUploadedResult: (result: ClassifyResponse | null, previewUrl: string | null) => void
  setUploadError: (err: string | null) => void
  clearUpload: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  // Gallery state
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [classifyResult, setClassifyResult] = useState<ClassifyResponse | null>(null)
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyError, setClassifyError] = useState<string | null>(null)

  // Upload state
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)
  const [uploadedResult, setUploadedResultState] = useState<ClassifyResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const setUploadedResult = useCallback(
    (result: ClassifyResponse | null, previewUrl: string | null) => {
      setUploadedResultState(result)
      setUploadedPreviewUrl(previewUrl)
    },
    [],
  )

  const clearUpload = useCallback(() => {
    setUploadedResultState(null)
    setUploadedPreviewUrl(null)
    setIsUploading(false)
    setUploadError(null)
    // NOTE: intentionally does NOT touch selectedImage, classifyResult, isClassifying, or classifyError
  }, [])

  return (
    <AppContext.Provider
      value={{
        selectedImage,
        setSelectedImage,
        classifyResult,
        setClassifyResult,
        isClassifying,
        setIsClassifying,
        classifyError,
        setClassifyError,
        uploadedPreviewUrl,
        uploadedResult,
        isUploading,
        uploadError,
        setIsUploading,
        setUploadedResult,
        setUploadError,
        clearUpload,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return ctx
}
