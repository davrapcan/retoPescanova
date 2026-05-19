'use client'
import type { TrainingOutlierItem } from '@/lib/types'

interface OutliersListProps {
  data: TrainingOutlierItem[]
}

export function OutliersList({ data }: OutliersListProps) {
  if (!data.length) return null

  return (
    <div className="flex flex-col gap-2 w-full">
      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        Personas que dedicaron mucho tiempo y obtuvieron mala nota — necesitan atención adicional.
      </p>
      <div className="flex flex-col gap-1.5">
        {data.map((user) => {
          const isCritical = user.severity === 'critical'
          const accentColor = isCritical ? 'var(--critical)' : 'var(--warning)'
          const bgColor = isCritical ? '#FEF2F2' : '#FFFBEB'

          return (
            <div
              key={user.user_id}
              className="flex items-center gap-2 rounded"
              style={{
                padding: '6px 8px',
                backgroundColor: bgColor,
                border: `0.5px solid ${isCritical ? '#FECACA' : '#FDE68A'}`,
              }}
            >
              <div
                className="shrink-0"
                style={{ width: '3px', height: '28px', borderRadius: '2px', backgroundColor: accentColor }}
              />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {user.user_id}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {user.location}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-blue)' }}>
                  {user.total_duration_min} min
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: accentColor }}>
                  {Math.min(user.score_pct, 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
