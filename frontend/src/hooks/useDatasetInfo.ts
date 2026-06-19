import { useEffect, useState } from 'react'
import { fetchDatasetInfo } from '../api/client'
import { DatasetInfoResponse } from '../types/api'

interface UseDatasetInfoResult {
  datasetInfo: DatasetInfoResponse | null
  loading: boolean
  error: string | null
}

export function useDatasetInfo(): UseDatasetInfoResult {
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchDatasetInfo()
      .then((data) => {
        if (!cancelled) setDatasetInfo(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load dataset info'
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

  return { datasetInfo, loading, error }
}
