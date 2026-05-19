'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
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

function useMockOrFetch<T>(mockValue: T, fetcher: () => Promise<{ data: T | null }>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCKS) {
      setData(mockValue)
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

export function useTrainingKpis() {
  return useMockOrFetch<TrainingKpis>(mockTrainingKpis, () => api.training.kpis())
}

export function useTrainingByCountry() {
  return useMockOrFetch<TrainingCountryItem[]>(mockTrainingByCountry, () => api.training.byCountry())
}

export function useTrainingTimeline() {
  return useMockOrFetch<TrainingTimelineItem[]>(mockTrainingTimeline, () => api.training.timeline())
}

export function useTrainingFriction() {
  return useMockOrFetch<TrainingFriction>(mockTrainingFriction, () => api.training.friction())
}

export function useTrainingDistribution() {
  return useMockOrFetch<TrainingDistributionItem[]>(mockTrainingDistribution, () => api.training.distribution())
}

export function useTrainingOutliers(limit = 4) {
  const [data, setData] = useState<TrainingOutlierItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (USE_MOCKS) {
      setData(mockTrainingOutliers.slice(0, limit))
      setLoading(false)
      return
    }
    api.training.outliers(limit)
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [limit])

  return { data, loading, error }
}

export function useTrainingBanner() {
  return useMockOrFetch<TrainingBanner>(mockTrainingBanner, () => api.training.banner())
}
