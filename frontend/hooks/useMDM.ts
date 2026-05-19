'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem } from '@/lib/types'
import {
  mockMDMBanner,
  mockMDMByOffice,
  mockMDMKpis,
  mockMDMTimeline,
  mockMDMTopPatches,
} from '@/lib/mocks/mdm'

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

function useMockOrFetch<T>(mockData: T, fetcher: () => Promise<{ data: T | null }>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCKS) {
      setData(mockData)
      setLoading(false)
      return
    }
    fetcher()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, loading, error }
}

export function useMDMKpis() {
  return useMockOrFetch<MDMKpis>(mockMDMKpis, () => api.mdm.kpis())
}

export function useMDMByOffice() {
  return useMockOrFetch<MDMOfficeItem[]>(mockMDMByOffice, () => api.mdm.byOffice())
}

export function useMDMTopPatches(limit = 5) {
  return useMockOrFetch<MDMPatchItem[]>(mockMDMTopPatches, () => api.mdm.topPatches(limit))
}

export function useMDMTimeline() {
  return useMockOrFetch<MDMTimelineItem[]>(mockMDMTimeline, () => api.mdm.timeline())
}

export function useMDMBanner() {
  return useMockOrFetch<MDMBanner>(mockMDMBanner, () => api.mdm.banner())
}
