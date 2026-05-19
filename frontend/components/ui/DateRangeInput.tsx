'use client'

type Props = {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
}

export function DateRangeInput({ from, to, onChange }: Props) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Rango de fechas</label>
      <div className="flex gap-2">
        <input
          type="date"
          value={from}
          onChange={e => onChange({ from: e.target.value, to })}
          className="text-xs px-2 py-1.5 rounded border bg-white w-full"
          style={{ borderColor: 'var(--border)' }}
        />
        <input
          type="date"
          value={to}
          onChange={e => onChange({ from, to: e.target.value })}
          className="text-xs px-2 py-1.5 rounded border bg-white w-full"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>
    </div>
  )
}
