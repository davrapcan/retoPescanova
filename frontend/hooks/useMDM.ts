'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { MDMBanner, MDMKpis, MDMOfficeItem, MDMPatchItem, MDMTimelineItem } from '@/lib/types'

export function useMDMKpis() {
  const [data, setData] = useState<MDMKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mdm.kpis()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useMDMByOffice() {
  const [data, setData] = useState<MDMOfficeItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mdm.byOffice()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useMDMTopPatches(limit = 5) {
  const [data, setData] = useState<MDMPatchItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mdm.topPatches(limit)
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [limit])

  return { data, loading, error }
}

export function useMDMTimeline() {
  const [data, setData] = useState<MDMTimelineItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mdm.timeline()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}

export function useMDMBanner() {
  const [data, setData] = useState<MDMBanner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.mdm.banner()
      .then((r) => setData(r.data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
