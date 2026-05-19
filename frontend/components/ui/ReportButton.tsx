'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { MultiSelect, MultiSelectOption } from './MultiSelect'
import { DateRangeInput } from './DateRangeInput'

type Kind = 'mdm' | 'training'

type Props = { kind: Kind }

type MdmOptions = { patches: MultiSelectOption[]; offices: MultiSelectOption[] }
type TrainingOptions = { countries: MultiSelectOption[]; modules: MultiSelectOption[] }

function PdfIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path
        d="M5.5 9h5M5.5 11h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ReportButton({ kind }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedPatches, setSelectedPatches] = useState<string[]>([])
  const [selectedOffices, setSelectedOffices] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const [mdmOpts, setMdmOpts] = useState<MdmOptions>({ patches: [], offices: [] })
  const [trainOpts, setTrainOpts] = useState<TrainingOptions>({ countries: [], modules: [] })

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
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

  useEffect(() => {
    if (!open) return
    if (kind === 'mdm' && mdmOpts.patches.length === 0) {
      Promise.all([api.mdm.topPatches(50), api.mdm.byOffice()]).then(([patches, offices]) => {
        setMdmOpts({
          patches: (patches.data ?? []).map((p) => ({
            value: String(p.patch_id),
            label: `${p.bulletin_id} — ${p.description.slice(0, 40)}`,
          })),
          offices: (offices.data ?? []).map((o) => ({
            value: o.office_code,
            label: `${o.office_code} · ${o.office}`,
          })),
        })
      })
    }
    if (kind === 'training' && trainOpts.countries.length === 0) {
      Promise.all([api.training.byCountry(), api.training.modules()]).then(
        ([countries, modules]) => {
          setTrainOpts({
            countries: (countries.data ?? []).map((c) => ({ value: c.location, label: c.location })),
            modules: (modules.data ?? []).map((m) => ({ value: m, label: m })),
          })
        },
      )
    }
  }, [open, kind, mdmOpts.patches.length, trainOpts.countries.length])

  function buildUrl(): string {
    if (kind === 'mdm') {
      return api.reports.mdmUrl({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        patch_id: selectedPatches.length ? selectedPatches.join(',') : undefined,
        office: selectedOffices.length ? selectedOffices.join(',') : undefined,
      })
    }
    return api.reports.trainingUrl({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      location: selectedCountries.length ? selectedCountries.join(',') : undefined,
      module: selectedModules.length ? selectedModules.join(',') : undefined,
    })
  }

  function onGenerate() {
    window.open(buildUrl(), '_blank')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Exportar a PDF"
        aria-label="Exportar a PDF"
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-slate-50"
        style={{
          border: '0.5px solid var(--border)',
          backgroundColor: open ? '#F1F5F9' : '#fff',
          color: 'var(--text-primary)',
        }}
      >
        <PdfIcon />
        <span>PDF</span>
        <ChevronIcon />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50 w-80 p-3 bg-white rounded-md"
          style={{
            border: '0.5px solid var(--border)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
          }}
        >
          <div
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Exportar {kind === 'mdm' ? 'MDM' : 'Formación'}
          </div>

          <div className="space-y-2">
            <DateRangeInput
              from={dateFrom}
              to={dateTo}
              onChange={({ from, to }) => {
                setDateFrom(from)
                setDateTo(to)
              }}
            />

            {kind === 'mdm' && (
              <>
                <MultiSelect
                  label="Tipo de parche"
                  options={mdmOpts.patches}
                  selected={selectedPatches}
                  onChange={setSelectedPatches}
                />
                <MultiSelect
                  label="Oficina"
                  options={mdmOpts.offices}
                  selected={selectedOffices}
                  onChange={setSelectedOffices}
                />
              </>
            )}
            {kind === 'training' && (
              <>
                <MultiSelect
                  label="País"
                  options={trainOpts.countries}
                  selected={selectedCountries}
                  onChange={setSelectedCountries}
                />
                <MultiSelect
                  label="Módulo"
                  options={trainOpts.modules}
                  selected={selectedModules}
                  onChange={setSelectedModules}
                />
              </>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1.5 rounded hover:bg-slate-50"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGenerate}
              className="text-xs px-3 py-1.5 rounded text-white font-medium"
              style={{ backgroundColor: 'var(--brand-blue)' }}
            >
              Generar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
