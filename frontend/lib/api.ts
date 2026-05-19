import type {
  ApiResponse,
  MDMBanner,
  MDMByOffice,
  MDMKpis,
  MDMOfficeItem,
  MDMPatchItem,
  MDMTimelineItem,
  MDMTopPatches,
  MDMTimeline,
  TrainingBanner,
  TrainingByCountry,
  TrainingCountryItem,
  TrainingDistribution,
  TrainingDistributionItem,
  TrainingFriction,
  TrainingKpis,
  TrainingOutlierItem,
  TrainingOutliers,
  TrainingTimeline,
  TrainingTimelineItem,
  TrainingUserItem,
} from './types'

const BASE_URL = 'http://localhost:8000/api/v1'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`)
  }
  return res.json() as Promise<ApiResponse<T>>
}

export const api = {
  mdm: {
    kpis: (params?: { date_from?: string; date_to?: string }) =>
      fetchApi<MDMKpis>(`/mdm/kpis${toQuery(params)}`),

    byOffice: (params?: { date_from?: string; date_to?: string; office?: string }) =>
      fetchApi<MDMOfficeItem[]>(`/mdm/by-office${toQuery(params)}`),

    topPatches: (limit = 5, params?: { office?: string }) =>
      fetchApi<MDMPatchItem[]>(`/mdm/top-patches?limit=${limit}${toQuery(params, false)}`),

    timeline: (params?: { date_from?: string; date_to?: string; office?: string }) =>
      fetchApi<MDMTimelineItem[]>(`/mdm/timeline${toQuery(params)}`),

    banner: () =>
      fetchApi<MDMBanner>('/mdm/banner'),
  },

  training: {
    kpis: (params?: { date_from?: string; date_to?: string; location?: string }) =>
      fetchApi<TrainingKpis>(`/training/kpis${toQuery(params)}`),

    byCountry: (params?: { date_from?: string; date_to?: string }) =>
      fetchApi<TrainingCountryItem[]>(`/training/by-country${toQuery(params)}`),

    timeline: (params?: { date_from?: string; date_to?: string; location?: string }) =>
      fetchApi<TrainingTimelineItem[]>(`/training/timeline${toQuery(params)}`),

    friction: (params?: { date_from?: string; date_to?: string; location?: string }) =>
      fetchApi<TrainingFriction>(`/training/friction${toQuery(params)}`),

    distribution: (params?: { date_from?: string; date_to?: string; location?: string }) =>
      fetchApi<TrainingDistributionItem[]>(`/training/distribution${toQuery(params)}`),

    outliers: (limit = 4, params?: { date_from?: string; date_to?: string; location?: string }) =>
      fetchApi<TrainingOutlierItem[]>(`/training/outliers?limit=${limit}${toQuery(params, false)}`),

    users: (sort: 'best' | 'worst' = 'worst', limit = 50, params?: { location?: string }) =>
      fetchApi<TrainingUserItem[]>(`/training/users?sort=${sort}&limit=${limit}${toQuery(params, false)}`),

    banner: () =>
      fetchApi<TrainingBanner>('/training/banner'),
  },

  ingest: {
    mdm: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE_URL}/ingest/mdm`, { method: 'POST', body: form }).then(r => r.json())
    },
    training: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE_URL}/ingest/training`, { method: 'POST', body: form }).then(r => r.json())
    },
    status: () =>
      fetchApi<{ mdm_loaded: boolean; training_loaded: boolean }>('/ingest/status'),
  },
}

function toQuery(params?: Record<string, string | number | undefined>, leading = true): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (!entries.length) return ''
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
  return leading ? `?${qs}` : `&${qs}`
}
