export interface ModelMetadata {
  model_id: string
  dataset: string
  version: string
  framework: string
}

export interface ClassifyResponse {
  label: 'NORMAL' | 'PNEUMONIA'
  confidence: number // 0-1
  heatmap_b64: string // data URI
  region_detected: boolean
  model_metadata: ModelMetadata
}

export interface GalleryImage {
  id: string
  url: string
  label: string
  index: number
}

export interface GalleryResponse {
  images: GalleryImage[]
  total: number
}

export interface ClassDistribution {
  NORMAL: number
  PNEUMONIA: number
}

export interface DatasetInfoResponse {
  name: string
  hf_url: string
  train_count: number
  test_count: number
  validation_count: number
  class_distribution: ClassDistribution
}
