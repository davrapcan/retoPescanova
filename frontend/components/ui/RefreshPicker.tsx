'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboardFilters, type RefreshKey } from '@/lib/filters'

const OPTIONS: { key: RefreshKey; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: '30s', label: '30s' },
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
]

function RefreshIcon({ size = 12, spinning = false }: { size?: number; spinning?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={spinning ? { animation: 'rp-spin 0.8s linear infinite' } : undefined}
    >
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export function RefreshPicker() {
  const { refresh, setRefresh, refetch } = useDashboardFilters()
  const [open, setOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
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

  function handleRefresh() {
    setSpinning(true)
    refetch()
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <div className="flex items-stretch" ref={popRef}>
      <button
        type="button"
        onClick={handleRefresh}
        title="Recargar ahora"
        aria-label="Recargar ahora"
        className="flex items-center justify-center px-2 rounded-l transition-colors hover:bg-slate-50"
        style={{
          border: '0.5px solid var(--border)',
          borderRight: 'none',
          backgroundColor: '#fff',
          color: 'var(--text-primary)',
        }}
      >
        <RefreshIcon spinning={spinning} />
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded-r text-xs font-medium transition-colors hover:bg-slate-50"
          style={{
            border: '0.5px solid var(--border)',
            backgroundColor: '#fff',
            color: refresh === 'off' ? 'var(--text-secondary)' : 'var(--brand-blue)',
          }}
        >
          <span>{refresh === 'off' ? 'Off' : refresh}</span>
          <ChevronIcon />
        </button>

        {open && (
          <div
            className="absolute right-0 mt-1 bg-white rounded-md z-50"
            style={{
              border: '0.5px solid var(--border)',
              boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
              minWidth: '100px',
            }}
          >
            <div className="flex flex-col py-1">
              {OPTIONS.map((opt) => {
                const active = refresh === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setRefresh(opt.key)
                      setOpen(false)
                    }}
                    className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                    style={{
                      color: active ? 'var(--brand-blue)' : 'var(--text-primary)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes rp-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
