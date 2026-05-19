'use client'

import { useDashboardFilters } from '@/lib/filters'

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completed',
  missing: 'Missing',
  in_progress: 'In Progress',
  failed: 'Failed',
}

interface Chip {
  key: string
  label: string
  onClear: () => void
}

export function ActiveFilters() {
  const { country, office, status, setCountry, setOffice, setStatus, reset } =
    useDashboardFilters()

  const chips: Chip[] = []
  if (country) chips.push({ key: 'country', label: `País: ${country}`, onClear: () => setCountry(undefined) })
  if (office) chips.push({ key: 'office', label: `Oficina: ${office}`, onClear: () => setOffice(undefined) })
  if (status) chips.push({ key: 'status', label: `Estado: ${STATUS_LABEL[status] ?? status}`, onClear: () => setStatus(undefined) })

  if (!chips.length) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onClear}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors hover:bg-slate-100"
          style={{
            border: '0.5px solid var(--border)',
            backgroundColor: '#fff',
            color: 'var(--text-secondary)',
          }}
          title="Quitar filtro"
        >
          <span>{c.label}</span>
          <span style={{ fontSize: '12px', lineHeight: 1, color: 'var(--text-tertiary)' }}>×</span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => {
            setCountry(undefined)
            setOffice(undefined)
            setStatus(undefined)
          }}
          className="px-2 py-0.5 text-[10px] font-medium transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Limpiar todo
        </button>
      )}
    </div>
  )
}
