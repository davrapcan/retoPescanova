'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useTrainingUsers } from '@/hooks/useTraining'

interface Props {
  open: boolean
  onClose: () => void
}

export function UsersDetailModal({ open, onClose }: Props) {
  const [sort, setSort] = useState<'best' | 'worst'>('worst')
  const [limit, setLimit] = useState(50)
  const { data, loading, error } = useTrainingUsers(sort, limit, open)

  return (
    <Modal open={open} onClose={onClose} title="Resultados de usuarios" maxWidth="780px">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mostrar:</span>
          <TabBtn active={sort === 'worst'} onClick={() => setSort('worst')} variant="bad">
            Peores
          </TabBtn>
          <TabBtn active={sort === 'best'} onClick={() => setSort('best')} variant="good">
            Mejores
          </TabBtn>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Top:</span>
          {[20, 50, 100, 200].map((n) => (
            <TabBtn key={n} active={limit === n} onClick={() => setLimit(n)}>
              {n}
            </TabBtn>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ fontSize: '11px', color: 'var(--critical)' }}>Error: {error}</p>
      )}

      <div className="flex flex-col">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: '120px 1fr 90px 90px 90px',
            gap: '12px',
            padding: '8px 4px',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '0.5px solid var(--border)',
          }}
        >
          <div>Usuario</div>
          <div>País</div>
          <div className="text-right">Tiempo</div>
          <div className="text-right">Módulos</div>
          <div className="text-right">Score</div>
        </div>

        {loading && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Cargando…
          </div>
        )}

        {!loading && data?.map((u) => {
          const scoreColor =
            u.score_pct >= 80 ? 'var(--ok)'
            : u.score_pct >= 50 ? 'var(--warning)'
            : 'var(--critical)'
          return (
            <div
              key={u.user_id}
              className="grid items-center"
              style={{
                gridTemplateColumns: '120px 1fr 90px 90px 90px',
                gap: '12px',
                padding: '8px 4px',
                fontSize: '12px',
                borderBottom: '0.5px solid #F1F5F9',
              }}
            >
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                {u.user_id}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{u.location}</div>
              <div className="text-right" style={{ color: 'var(--brand-blue)' }}>
                {u.total_duration_min} min
              </div>
              <div className="text-right" style={{ color: 'var(--text-secondary)' }}>
                {u.modules_completed}/{u.modules_assigned}
              </div>
              <div className="text-right" style={{ color: scoreColor, fontWeight: 600 }}>
                {u.score_pct.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

function TabBtn({
  active,
  onClick,
  children,
  variant,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  variant?: 'good' | 'bad'
}) {
  const activeBg =
    variant === 'good' ? 'var(--ok)' : variant === 'bad' ? 'var(--critical)' : 'var(--brand-blue)'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        border: '0.5px solid',
        borderColor: active ? activeBg : 'var(--border)',
        backgroundColor: active ? activeBg : '#fff',
        color: active ? '#fff' : 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
