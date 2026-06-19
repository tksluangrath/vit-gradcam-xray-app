import axios from 'axios'
import { ClassifyResponse, DatasetInfoResponse, GalleryResponse } from '../types/api'

const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export async function classifyImage(source: string | File, signal?: AbortSignal): Promise<ClassifyResponse> {
  let blob: Blob
  let filename: string

  if (source instanceof File) {
    // Uploaded file — use directly, no extra fetch needed
    blob = source
    filename = source.name
  } else {
    // Gallery image URL — fetch the blob first
    const response = await fetch(source, { signal })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    blob = await response.blob()
    filename = 'image.jpg'
  }

  const form = new FormData()
  form.append('file', blob, filename)

  // Axios auto-sets Content-Type: multipart/form-data with the correct boundary when given FormData
  const { data } = await axiosInstance.post<ClassifyResponse>('/classify', form, { signal })
  return data
}

export async function fetchGallery(): Promise<GalleryResponse> {
  const { data } = await axiosInstance.get<GalleryResponse>('/images')
  return data
}

export async function fetchDatasetInfo(): Promise<DatasetInfoResponse> {
  const { data } = await axiosInstance.get<DatasetInfoResponse>('/dataset-info')
  return data
}
