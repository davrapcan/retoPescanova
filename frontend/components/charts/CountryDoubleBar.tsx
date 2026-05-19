'use client'
import type { TrainingCountryItem } from '@/lib/types'
import { thresholds } from '@/lib/theme'

interface CountryDoubleBarProps {
  data: TrainingCountryItem[]
}

function completionColor(rate: number): string {
  const pct = rate * 100
  if (pct >= thresholds.training.completionAmber) return 'var(--ok)'
  if (pct >= thresholds.training.completionRed)   return 'var(--warning)'
  return 'var(--critical)'
}

function scoreOpacity(score: number): number {
  return 0.25 + (Math.min(score, 100) / 100) * 0.75
}

export function CountryDoubleBar({ data }: CountryDoubleBarProps) {
  if (!data.length) return null

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {data.map((country) => {
        const compPct   = Math.min(country.completion_rate * 100, 100)
        const scorePct  = Math.min(country.avg_score_pct, 100)
        const compColor = completionColor(country.completion_rate)
        const scoreOp   = scoreOpacity(country.avg_score_pct)

        return (
          <div key={country.location} className="flex items-center gap-2">
            {/* Country label */}
            <div
              className="flex items-center gap-1 shrink-0"
              style={{ width: '96px' }}
            >
              <span
                className="truncate"
                style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 500 }}
                title={country.location}
              >
                {country.location}
              </span>
              {country.below_threshold && (
                <span style={{ fontSize: '10px', color: 'var(--warning)', lineHeight: 1 }}>⚠</span>
              )}
            </div>

            {/* Bars area */}
            <div className="flex flex-col gap-0.5 flex-1" style={{ minWidth: 0 }}>
              {/* Thick bar: completion rate, 7px */}
              <div
                className="w-full rounded-sm overflow-hidden"
                style={{ height: '7px', backgroundColor: 'var(--border)' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${compPct}%`,
                    backgroundColor: compColor,
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Thin bar: score_pct, 4px */}
              <div
                className="w-full rounded-sm overflow-hidden"
                style={{ height: '4px', backgroundColor: 'var(--border)' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${scorePct}%`,
                    backgroundColor: `rgba(0, 90, 156, ${scoreOp})`,
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Label */}
            <div
              className="shrink-0 text-right"
              style={{ width: '80px', fontSize: '10px', color: 'var(--text-secondary)' }}
            >
              <span style={{ color: compColor, fontWeight: 600 }}>{Math.round(compPct)}%</span>
              <span style={{ color: 'var(--text-tertiary)' }}> · </span>
              <span style={{ color: 'var(--brand-blue)' }}>{Math.round(scorePct)}pts</span>
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div
        className="flex gap-4 mt-1 pt-1"
        style={{ borderTop: '0.5px solid var(--border)', fontSize: '9px', color: 'var(--text-tertiary)' }}
      >
        <div className="flex items-center gap-1">
          <div style={{ width: '12px', height: '5px', background: 'var(--ok)', borderRadius: '1px' }} />
          <span>Finalización</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: '12px', height: '3px', background: 'var(--brand-blue)', borderRadius: '1px', opacity: 0.7 }} />
          <span>Score</span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--warning)' }}>⚠</span>
          <span>Bajo umbral</span>
        </div>
      </div>
    </div>
  )
}
