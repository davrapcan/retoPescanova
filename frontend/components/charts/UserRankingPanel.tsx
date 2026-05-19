'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useTrainingUsers } from '@/hooks/useTraining'

const MIN_PER_MODULE_FAST = 5   // menos de esto = sospechosamente rápido
const MIN_PER_MODULE_SLOW = 60  // más de esto = muy lento

function timeTag(durationMin: number, modulesCompleted: number): 'fast' | 'slow' | null {
  const perModule = durationMin / Math.max(modulesCompleted, 1)
  if (perModule < MIN_PER_MODULE_FAST) return 'fast'
  if (perModule > MIN_PER_MODULE_SLOW) return 'slow'
  return null
}

function SortToggle({
  sort,
  onChange,
}: {
  sort: 'best' | 'worst'
  onChange: (s: 'best' | 'worst') => void
}) {
  return (
    <div className="flex gap-1" data-no-expand>
      {(['worst', 'best'] as const).map((s) => {
        const active = sort === s
        const activeColor = s === 'worst' ? 'var(--critical)' : 'var(--ok)'
        return (
          <button
            key={s}
            onClick={(e) => { e.stopPropagation(); onChange(s) }}
            style={{
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 500,
              border: '0.5px solid',
              borderColor: active ? activeColor : 'var(--border)',
              backgroundColor: active ? activeColor : '#fff',
              color: active ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {s === 'worst' ? 'Peores' : 'Mejores'}
          </button>
        )
      })}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded animate-pulse w-full" style={{ height: '44px', backgroundColor: '#E2E8F0' }} />
      ))}
    </div>
  )
}

export function UserRankingPanel() {
  const [sort, setSort] = useState<'best' | 'worst'>('worst')
  const { data, loading } = useTrainingUsers(sort, 5, true)

  const title = sort === 'worst'
    ? '¿Quién necesita más apoyo?'
    : '¿Quién destaca en la formación?'

  return (
    <Card
      title={title}
      extra={<SortToggle sort={sort} onChange={setSort} />}
      inspectData={data ?? undefined}
      panelId="training-users"
      className="h-full"
    >
      <div className="h-full overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : data?.length ? (
          <div className="flex flex-col gap-1.5">
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4, marginBottom: '2px' }}>
              {sort === 'worst'
                ? 'Usuarios con peor nota — pueden necesitar apoyo adicional.'
                : 'Usuarios con mejor nota — referentes del equipo.'}
            </p>
            {data.map((user) => {
              const scoreColor =
                user.score_pct >= 80 ? 'var(--ok)'
                : user.score_pct >= 50 ? 'var(--warning)'
                : 'var(--critical)'
              const warn = timeTag(user.total_duration_min, user.modules_completed)
              const perModule = Math.round(user.total_duration_min / Math.max(user.modules_completed, 1))
              const isCritical = sort === 'worst' && user.score_pct < 20

              return (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 rounded"
                  style={{
                    padding: '6px 8px',
                    backgroundColor: isCritical ? '#FEF2F2' : '#F8FAFC',
                    border: `0.5px solid ${isCritical ? '#FECACA' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="shrink-0"
                    style={{ width: '3px', height: '34px', borderRadius: '2px', backgroundColor: scoreColor }}
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {user.user_id}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      {user.location} · {user.modules_completed}/{user.modules_assigned} módulos
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor }}>
                      {user.score_pct.toFixed(1)}%
                    </span>
                    <div className="flex items-center gap-1">
                      {warn && (
                        <span
                          style={{
                            fontSize: '9px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 600,
                            backgroundColor: warn === 'fast' ? '#FEF9C3' : '#FEF3C7',
                            color: warn === 'fast' ? '#854D0E' : '#92400E',
                            border: `0.5px solid ${warn === 'fast' ? '#FDE047' : '#FCD34D'}`,
                          }}
                        >
                          {warn === 'fast' ? 'Muy rápido' : 'Muy lento'}
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: 'var(--brand-blue)', fontWeight: 600 }}>
                        {perModule} min/test
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '16px', textAlign: 'center' }}>
            Sin datos
          </p>
        )}
      </div>
    </Card>
  )
}
