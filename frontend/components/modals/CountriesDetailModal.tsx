'use client'
import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { TrainingCountryItem } from '@/lib/types'
import { thresholds } from '@/lib/theme'

interface Props {
  open: boolean
  onClose: () => void
  data: TrainingCountryItem[] | null
}

type SortKey = 'completion' | 'score' | 'users'

function completionColor(rate: number): string {
  const pct = rate * 100
  if (pct >= thresholds.training.completionAmber) return 'var(--ok)'
  if (pct >= thresholds.training.completionRed) return 'var(--warning)'
  return 'var(--critical)'
}

export function CountriesDetailModal({ open, onClose, data }: Props) {
  const [sort, setSort] = useState<SortKey>('completion')

  const sorted = useMemo(() => {
    if (!data) return []
    const rows = [...data]
    if (sort === 'completion') rows.sort((a, b) => a.completion_rate - b.completion_rate)
    if (sort === 'score') rows.sort((a, b) => a.avg_score_pct - b.avg_score_pct)
    if (sort === 'users') rows.sort((a, b) => b.user_count - a.user_count)
    return rows
  }, [data, sort])

  return (
    <Modal open={open} onClose={onClose} title={`Países en riesgo formativo (${data?.length ?? 0})`}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ordenar por:</span>
        <TabBtn active={sort === 'completion'} onClick={() => setSort('completion')}>Finalización ↑</TabBtn>
        <TabBtn active={sort === 'score'} onClick={() => setSort('score')}>Score ↑</TabBtn>
        <TabBtn active={sort === 'users'} onClick={() => setSort('users')}>Usuarios ↓</TabBtn>
      </div>

      <div className="flex flex-col">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: '1fr 80px 90px 90px',
            gap: '12px',
            padding: '8px 4px',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '0.5px solid var(--border)',
          }}
        >
          <div>País</div>
          <div className="text-right">Usuarios</div>
          <div className="text-right">Finalización</div>
          <div className="text-right">Score</div>
        </div>
        {sorted.map((c) => {
          const compPct = c.completion_rate * 100
          const color = completionColor(c.completion_rate)
          return (
            <div
              key={c.location}
              className="grid items-center"
              style={{
                gridTemplateColumns: '1fr 80px 90px 90px',
                gap: '12px',
                padding: '10px 4px',
                fontSize: '12px',
                borderBottom: '0.5px solid #F1F5F9',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.location}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.location_iso}</span>
                {c.below_threshold && (
                  <span style={{ fontSize: '11px', color: 'var(--warning)' }} title="Por debajo del umbral">
                    ⚠
                  </span>
                )}
              </div>
              <div className="text-right" style={{ color: 'var(--text-secondary)' }}>
                {c.user_count}
              </div>
              <div className="text-right" style={{ color, fontWeight: 600 }}>
                {compPct.toFixed(1)}%
              </div>
              <div className="text-right" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>
                {c.avg_score_pct.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        border: '0.5px solid',
        borderColor: active ? 'var(--brand-blue)' : 'var(--border)',
        backgroundColor: active ? 'var(--brand-blue)' : '#fff',
        color: active ? '#fff' : 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
