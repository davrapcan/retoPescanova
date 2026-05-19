'use client'
import type { MDMPatchItem } from '@/lib/types'
import { colors } from '@/lib/theme'

interface TopPatchesListProps {
  data: MDMPatchItem[]
}

export function TopPatchesList({ data }: TopPatchesListProps) {
  const maxRisk = Math.max(...data.map((p) => p.risk_score), 1)

  return (
    <div className="flex flex-col w-full h-full justify-between" style={{ gap: '8px' }}>
      {data.map((patch) => {
        const barColor = patch.failed_systems > 0 ? colors.critical : colors.warning
        const pct = Math.round((patch.risk_score / maxRisk) * 100)
        const affected = patch.missing_systems + patch.failed_systems

        return (
          <div key={patch.patch_id} className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '4px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="font-medium shrink-0"
                style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'monospace' }}
              >
                {patch.bulletin_id}
              </span>
              <span
                className="truncate text-right"
                style={{ fontSize: '10px', color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}
                title={patch.description}
              >
                {patch.description}
              </span>
              <span
                className="shrink-0 font-medium"
                style={{ fontSize: '11px', color: barColor }}
              >
                {affected}
              </span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', backgroundColor: '#E2E8F0' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
