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

export function useTrainingKpis() {
  const [data, setData] = useState<TrainingKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.kpis()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useTrainingByCountry() {
  const [data, setData] = useState<TrainingCountryItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.byCountry()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useTrainingTimeline() {
  const [data, setData] = useState<TrainingTimelineItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.timeline()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useTrainingFriction() {
  const [data, setData] = useState<TrainingFriction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.friction()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useTrainingDistribution() {
  const [data, setData] = useState<TrainingDistributionItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.distribution()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useTrainingOutliers(limit = 4) {
  const [data, setData] = useState<TrainingOutlierItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.outliers(limit)
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [limit])

  return { data, loading, error }
}

export function useTrainingBanner() {
  const [data, setData] = useState<TrainingBanner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.training.banner()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
