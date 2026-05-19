'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useDashboardFilters } from '@/lib/filters'
import type {
  TrainingBanner,
  TrainingCountryItem,
  TrainingDistributionItem,
  TrainingFriction,
  TrainingKpis,
  TrainingOutlierItem,
  TrainingTimelineItem,
} from '@/lib/types'
import {
  mockTrainingBanner,
  mockTrainingByCountry,
  mockTrainingDistribution,
  mockTrainingFriction,
  mockTrainingKpis,
  mockTrainingOutliers,
  mockTrainingTimeline,
} from '@/lib/mocks/training'

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
  deps: ReadonlyArray<unknown>,
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
  }, [key, refreshTick, tick, ...deps])

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

export function useTrainingKpis(): HookResult<TrainingKpis> {
  const { range, country } = useDashboardFilters()
  return useEndpoint(
    `training.kpis|${range.date_from ?? ''}|${range.date_to ?? ''}|${country ?? ''}`,
    withMock(mockTrainingKpis, () => api.training.kpis({ ...range, location: country })),
    [range.date_from, range.date_to, country],
  )
}

export function useTrainingByCountry(): HookResult<TrainingCountryItem[]> {
  const { range } = useDashboardFilters()
  return useEndpoint(
    `training.byCountry|${range.date_from ?? ''}|${range.date_to ?? ''}`,
    withMock(mockTrainingByCountry, () => api.training.byCountry(range)),
    [range.date_from, range.date_to],
  )
}

export function useTrainingTimeline(): HookResult<TrainingTimelineItem[]> {
  const { range, country } = useDashboardFilters()
  return useEndpoint(
    `training.timeline|${range.date_from ?? ''}|${range.date_to ?? ''}|${country ?? ''}`,
    withMock(mockTrainingTimeline, () => api.training.timeline({ ...range, location: country })),
    [range.date_from, range.date_to, country],
  )
}

export function useTrainingFriction(): HookResult<TrainingFriction> {
  const { range, country } = useDashboardFilters()
  return useEndpoint(
    `training.friction|${range.date_from ?? ''}|${range.date_to ?? ''}|${country ?? ''}`,
    withMock(mockTrainingFriction, () => api.training.friction({ ...range, location: country })),
    [range.date_from, range.date_to, country],
  )
}

export function useTrainingDistribution(): HookResult<TrainingDistributionItem[]> {
  const { range, country } = useDashboardFilters()
  return useEndpoint(
    `training.distribution|${range.date_from ?? ''}|${range.date_to ?? ''}|${country ?? ''}`,
    withMock(mockTrainingDistribution, () =>
      api.training.distribution({ ...range, location: country }),
    ),
    [range.date_from, range.date_to, country],
  )
}

export function useTrainingOutliers(limit = 4): HookResult<TrainingOutlierItem[]> {
  const { range, country } = useDashboardFilters()
  return useEndpoint(
    `training.outliers|${limit}|${range.date_from ?? ''}|${range.date_to ?? ''}|${country ?? ''}`,
    async () => {
      if (USE_MOCKS) return mockTrainingOutliers.slice(0, limit)
      const res = await api.training.outliers(limit, { ...range, location: country })
      return res.data
    },
    [limit, range.date_from, range.date_to, country],
  )
}

export function useTrainingBanner(): HookResult<TrainingBanner> {
  return useEndpoint(
    'training.banner',
    withMock(mockTrainingBanner, () => api.training.banner()),
    [],
  )
}
