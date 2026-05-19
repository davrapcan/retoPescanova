'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useDashboardFilters } from '@/lib/filters'
import type { MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem } from '@/lib/types'
import {
  mockMDMBanner,
  mockMDMByOffice,
  mockMDMKpis,
  mockMDMTimeline,
  mockMDMTopPatches,
} from '@/lib/mocks/mdm'

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true'

export interface HookResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
  refetch: () => void
}

function useEndpoint<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T | null>,
): HookResult<T> {
  const { refreshMs, refreshTick, refetch } = useDashboardFilters()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetcher(controller.signal)
      .then((value) => {
        if (!mounted.current) return
        setData(value)
        setLastUpdated(Date.now())
      })
      .catch((e: unknown) => {
        if (!mounted.current) return
        if ((e as { name?: string })?.name === 'AbortError') return
        setError(String(e))
      })
      .finally(() => {
        if (!mounted.current) return
        setLoading(false)
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshTick, tick])

  useEffect(() => {
    if (!refreshMs) return
    const id = setInterval(() => setTick((t) => t + 1), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])

  return { data, loading, error, lastUpdated, refetch }
}

function withMock<T>(mock: T, fn: () => Promise<{ data: T | null }>) {
  return async (_signal: AbortSignal): Promise<T | null> => {
    if (USE_MOCKS) return mock
    const res = await fn()
    return res.data
  }
}

export function useMDMKpis(): HookResult<MDMKpis> {
  const { range } = useDashboardFilters()
  return useEndpoint(
    `mdm.kpis|${range.date_from ?? ''}|${range.date_to ?? ''}`,
    withMock(mockMDMKpis, () => api.mdm.kpis(range)),
  )
}

export function useMDMByOffice(): HookResult<MDMOfficeItem[]> {
  // Source panel: never filters itself by the selected office,
  // so the click just highlights the bar + sets the global filter chip.
  const { range } = useDashboardFilters()
  return useEndpoint(
    `mdm.byOffice|${range.date_from ?? ''}|${range.date_to ?? ''}`,
    withMock(mockMDMByOffice, () => api.mdm.byOffice(range)),
  )
}

export function useMDMTopPatches(limit = 5): HookResult<MDMPatchItem[]> {
  const { office } = useDashboardFilters()
  return useEndpoint(
    `mdm.topPatches|${limit}|${office ?? ''}`,
    withMock(mockMDMTopPatches, () => api.mdm.topPatches(limit, { office })),
  )
}

export function useMDMTimeline(): HookResult<MDMTimelineItem[]> {
  const { range, office } = useDashboardFilters()
  return useEndpoint(
    `mdm.timeline|${range.date_from ?? ''}|${range.date_to ?? ''}|${office ?? ''}`,
    withMock(mockMDMTimeline, () => api.mdm.timeline({ ...range, office })),
  )
}

export function useMDMBanner(): HookResult<MDMBanner> {
  return useEndpoint(
    'mdm.banner',
    withMock(mockMDMBanner, () => api.mdm.banner()),
  )
}
