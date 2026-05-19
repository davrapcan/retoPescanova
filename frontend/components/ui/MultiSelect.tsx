'use client'
import { useEffect, useRef, useState } from 'react'

export type MultiSelectOption = { value: string; label: string }

type Props = {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}

export function MultiSelect({ label, options, selected, onChange, placeholder = 'Todos' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  }

  const summary =
    selected.length === 0 ? placeholder
      : selected.length === 1 ? options.find(o => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} seleccionados`

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-xs px-2 py-1.5 rounded border bg-white"
        style={{ borderColor: 'var(--border)' }}
      >
        {summary}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-white shadow-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-slate-400">Sin opciones</div>
          )}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
