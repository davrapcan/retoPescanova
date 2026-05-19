'use client'

import { useEffect, useRef, useState } from 'react'
import { TIME_RANGE_LABEL, useDashboardFilters, type TimeRangeKey } from '@/lib/filters'

const OPTIONS: TimeRangeKey[] = ['7d', '30d', '90d', 'all', 'custom']

function ClockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5V8l2.3 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TimeRangePicker() {
  const { timeRange, dateFrom, dateTo, setTimeRange } = useDashboardFilters()
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(dateFrom ?? '')
  const [customTo, setCustomTo] = useState(dateTo ?? '')
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label =
    timeRange === 'custom' && dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : TIME_RANGE_LABEL[timeRange]

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
        style={{
          border: '0.5px solid var(--border)',
          backgroundColor: '#fff',
          color: 'var(--text-primary)',
        }}
      >
        <ClockIcon />
        <span>{label}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 bg-white rounded-md z-50"
          style={{
            border: '0.5px solid var(--border)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            minWidth: '220px',
          }}
        >
          <div className="flex flex-col py-1">
            {OPTIONS.map((opt) => {
              const active = timeRange === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (opt !== 'custom') {
                      setTimeRange(opt)
                      setOpen(false)
                    } else {
                      setTimeRange('custom', {
                        dateFrom: customFrom || dateFrom || '',
                        dateTo: customTo || dateTo || '',
                      })
                    }
                  }}
                  className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                  style={{
                    color: active ? 'var(--brand-blue)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {TIME_RANGE_LABEL[opt]}
                </button>
              )
            })}
          </div>

          {timeRange === 'custom' && (
            <div
              className="px-3 py-2 flex flex-col gap-1.5"
              style={{ borderTop: '0.5px solid var(--border)' }}
            >
              <label className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Desde</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-1.5 py-0.5 rounded"
                  style={{ border: '0.5px solid var(--border)', fontSize: '11px' }}
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Hasta</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-1.5 py-0.5 rounded"
                  style={{ border: '0.5px solid var(--border)', fontSize: '11px' }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (customFrom && customTo) {
                    setTimeRange('custom', { dateFrom: customFrom, dateTo: customTo })
                    setOpen(false)
                  }
                }}
                disabled={!customFrom || !customTo}
                className="mt-1 px-2 py-1 rounded text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-blue)' }}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
