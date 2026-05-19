'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type TimeRangeKey = '7d' | '30d' | '90d' | 'all' | 'custom'
export type RefreshKey = 'off' | '30s' | '1m' | '5m'
export type StatusKey = 'completed' | 'missing' | 'in_progress' | 'failed'

export const REFRESH_MS: Record<RefreshKey, number> = {
  off: 0,
  '30s': 30_000,
  '1m': 60_000,
  '5m': 300_000,
}

export const TIME_RANGE_LABEL: Record<TimeRangeKey, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  all: 'Todo el histórico',
  custom: 'Personalizado',
}

export interface DateRange {
  date_from?: string
  date_to?: string
}

export interface DashboardFilters {
  timeRange: TimeRangeKey
  dateFrom?: string
  dateTo?: string
  refresh: RefreshKey
  country?: string
  office?: string
  status?: StatusKey
}

export interface DashboardFiltersApi extends DashboardFilters {
  range: DateRange
  refreshMs: number
  refreshTick: number
  setTimeRange: (k: TimeRangeKey, custom?: { dateFrom: string; dateTo: string }) => void
  setRefresh: (k: RefreshKey) => void
  setCountry: (c: string | undefined) => void
  setOffice: (o: string | undefined) => void
  setStatus: (s: StatusKey | undefined) => void
  toggleStatus: (s: StatusKey) => void
  refetch: () => void
  reset: () => void
}

const DEFAULTS: DashboardFilters = {
  timeRange: '30d',
  refresh: 'off',
}

const Ctx = createContext<DashboardFiltersApi | null>(null)

function computeRange(f: DashboardFilters): DateRange {
  if (f.timeRange === 'all') return {}
  if (f.timeRange === 'custom') {
    return { date_from: f.dateFrom, date_to: f.dateTo }
  }
  const days = f.timeRange === '7d' ? 7 : f.timeRange === '30d' ? 30 : 90
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - days)
  return {
    date_from: from.toISOString().slice(0, 10),
    date_to: to.toISOString().slice(0, 10),
  }
}

function parseFromUrl(sp: URLSearchParams): DashboardFilters {
  const range = sp.get('range') as TimeRangeKey | null
  const refresh = sp.get('refresh') as RefreshKey | null
  const f: DashboardFilters = {
    timeRange:
      range && ['7d', '30d', '90d', 'all', 'custom'].includes(range) ? range : DEFAULTS.timeRange,
    refresh: refresh && refresh in REFRESH_MS ? refresh : DEFAULTS.refresh,
  }
  if (f.timeRange === 'custom') {
    f.dateFrom = sp.get('from') ?? undefined
    f.dateTo = sp.get('to') ?? undefined
  }
  const country = sp.get('country')
  if (country) f.country = country
  const office = sp.get('office')
  if (office) f.office = office
  const status = sp.get('status') as StatusKey | null
  if (status && ['completed', 'missing', 'in_progress', 'failed'].includes(status)) {
    f.status = status
  }
  return f
}

function toQuery(f: DashboardFilters): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.timeRange !== DEFAULTS.timeRange) sp.set('range', f.timeRange)
  if (f.timeRange === 'custom') {
    if (f.dateFrom) sp.set('from', f.dateFrom)
    if (f.dateTo) sp.set('to', f.dateTo)
  }
  if (f.refresh !== DEFAULTS.refresh) sp.set('refresh', f.refresh)
  if (f.country) sp.set('country', f.country)
  if (f.office) sp.set('office', f.office)
  if (f.status) sp.set('status', f.status)
  return sp
}

export function DashboardFiltersProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<DashboardFilters>(() =>
    parseFromUrl(new URLSearchParams(searchParams?.toString() ?? '')),
  )
  const [refreshTick, setRefreshTick] = useState(0)

  // Re-parse if URL changes externally (back/forward navigation)
  const lastWrittenRef = useRef<string>('')
  useEffect(() => {
    const current = searchParams?.toString() ?? ''
    if (current === lastWrittenRef.current) return
    const parsed = parseFromUrl(new URLSearchParams(current))
    setFilters(parsed)
  }, [searchParams])

  // Push state changes to URL
  useEffect(() => {
    const qs = toQuery(filters).toString()
    if (qs === lastWrittenRef.current) return
    lastWrittenRef.current = qs
    const url = qs ? `${pathname}?${qs}` : pathname
    router.replace(url, { scroll: false })
  }, [filters, pathname, router])

  const update = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const setTimeRange = useCallback<DashboardFiltersApi['setTimeRange']>((k, custom) => {
    if (k === 'custom' && custom) {
      update({ timeRange: 'custom', dateFrom: custom.dateFrom, dateTo: custom.dateTo })
    } else {
      update({ timeRange: k, dateFrom: undefined, dateTo: undefined })
    }
  }, [update])

  const setRefresh = useCallback((k: RefreshKey) => update({ refresh: k }), [update])
  const setCountry = useCallback((c: string | undefined) => update({ country: c }), [update])
  const setOffice = useCallback((o: string | undefined) => update({ office: o }), [update])
  const setStatus = useCallback((s: StatusKey | undefined) => update({ status: s }), [update])
  const toggleStatus = useCallback(
    (s: StatusKey) => setFilters((prev) => ({ ...prev, status: prev.status === s ? undefined : s })),
    [],
  )
  const refetch = useCallback(() => setRefreshTick((t) => t + 1), [])
  const reset = useCallback(() => setFilters(DEFAULTS), [])

  const range = useMemo(() => computeRange(filters), [filters])
  const refreshMs = REFRESH_MS[filters.refresh]

  const value = useMemo<DashboardFiltersApi>(
    () => ({
      ...filters,
      range,
      refreshMs,
      refreshTick,
      setTimeRange,
      setRefresh,
      setCountry,
      setOffice,
      setStatus,
      toggleStatus,
      refetch,
      reset,
    }),
    [filters, range, refreshMs, refreshTick, setTimeRange, setRefresh, setCountry, setOffice, setStatus, toggleStatus, refetch, reset],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDashboardFilters(): DashboardFiltersApi {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('useDashboardFilters must be used inside <DashboardFiltersProvider>')
  }
  return ctx
}
