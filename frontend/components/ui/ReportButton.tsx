'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { MultiSelect, MultiSelectOption } from './MultiSelect'
import { DateRangeInput } from './DateRangeInput'

type Kind = 'mdm' | 'training'

type Props = { kind: Kind }

type MdmOptions = { patches: MultiSelectOption[]; offices: MultiSelectOption[] }
type TrainingOptions = { countries: MultiSelectOption[]; modules: MultiSelectOption[] }

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
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (kind === 'mdm' && mdmOpts.patches.length === 0) {
      Promise.all([api.mdm.topPatches(50), api.mdm.byOffice()]).then(([patches, offices]) => {
        setMdmOpts({
          patches: (patches.data ?? []).map(p => ({
            value: String(p.patch_id),
            label: `${p.bulletin_id} — ${p.description.slice(0, 40)}`,
          })),
          offices: (offices.data ?? []).map(o => ({
            value: o.office_code,
            label: `${o.office_code} · ${o.office}`,
          })),
        })
      })
    }
    if (kind === 'training' && trainOpts.countries.length === 0) {
      Promise.all([api.training.byCountry(), api.training.modules()]).then(([countries, modules]) => {
        setTrainOpts({
          countries: (countries.data ?? []).map(c => ({ value: c.location, label: c.location })),
          modules: (modules.data ?? []).map(m => ({ value: m, label: m })),
        })
      })
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Exportar PDF"
        className="w-7 h-7 inline-flex items-center justify-center rounded text-xs font-medium"
        style={{
          backgroundColor: open ? 'var(--brand-blue)' : 'transparent',
          color: open ? '#fff' : 'var(--text-secondary)',
          border: '0.5px solid var(--border)',
        }}
      >
        PDF
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50 w-72 p-3 rounded border bg-white shadow-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Exportar {kind === 'mdm' ? 'MDM' : 'Formación'} a PDF
          </div>

          <div className="space-y-2">
            <DateRangeInput from={dateFrom} to={dateTo} onChange={({ from, to }) => { setDateFrom(from); setDateTo(to) }} />

            {kind === 'mdm' && (
              <>
                <MultiSelect label="Tipo de parche" options={mdmOpts.patches}
                             selected={selectedPatches} onChange={setSelectedPatches} />
                <MultiSelect label="Oficina" options={mdmOpts.offices}
                             selected={selectedOffices} onChange={setSelectedOffices} />
              </>
            )}
            {kind === 'training' && (
              <>
                <MultiSelect label="País" options={trainOpts.countries}
                             selected={selectedCountries} onChange={setSelectedCountries} />
                <MultiSelect label="Módulo" options={trainOpts.modules}
                             selected={selectedModules} onChange={setSelectedModules} />
              </>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1.5 rounded"
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
