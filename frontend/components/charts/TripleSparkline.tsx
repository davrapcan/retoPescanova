'use client'
import type { TrainingTimelineItem } from '@/lib/types'

interface TripleSparklineProps {
  data: TrainingTimelineItem[]
}

interface SparkProps {
  values: number[]
  color: string
  label: string
  formatValue: (v: number) => string
  showMonths?: string[]
}

function Sparkline({ values, color, label, formatValue, showMonths }: SparkProps) {
  const W = 120
  const H = 20
  const PAD = 4

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const n = values.length

  const xs = values.map((_, i) => PAD + (i / (n - 1)) * (W - PAD * 2))
  const ys = values.map((v) => H - PAD - ((v - min) / range) * (H - PAD * 2))

  const first = values[0]
  const last  = values[values.length - 1]
  const delta = last - first
  const sign  = delta >= 0 ? '+' : ''
  const deltaColor = delta >= 0 ? 'var(--ok)' : 'var(--critical)'

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Label */}
      <span
        className="shrink-0"
        style={{ width: '76px', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}
      >
        {label}
      </span>

      {/* SVG sparkline */}
      <div className="flex-1 relative" style={{ minWidth: 0 }}>
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <polyline
            points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* End dot */}
          <circle
            cx={xs[xs.length - 1]}
            cy={ys[ys.length - 1]}
            r="2.5"
            fill={color}
          />
        </svg>
        {/* Month labels as HTML to avoid stretching from SVG scaling */}
        {showMonths && (
          <div className="relative" style={{ height: '12px' }}>
            {showMonths.map((m, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(xs[i] / W) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  color: 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Current value */}
      <span
        className="shrink-0"
        style={{ width: '36px', fontSize: '11px', fontWeight: 600, color, textAlign: 'right' }}
      >
        {formatValue(last)}
      </span>

      {/* Delta */}
      <span
        className="shrink-0"
        style={{ width: '32px', fontSize: '10px', color: deltaColor, textAlign: 'right' }}
      >
        {sign}{formatValue(delta)}
      </span>
    </div>
  )
}

export function TripleSparkline({ data }: TripleSparklineProps) {
  if (!data.length) return null

  const months = data.map((d) => d.month)

  return (
    <div className="flex flex-col gap-3 w-full">
      <Sparkline
        values={data.map((d) => d.completion_rate * 100)}
        color="var(--ok)"
        label="Finalización"
        formatValue={(v) => `${Math.abs(Math.round(v))}%`}
      />
      <Sparkline
        values={data.map((d) => d.avg_score_pct)}
        color="var(--warning)"
        label="Score medio"
        formatValue={(v) => `${Math.abs(Math.round(v))}%`}
      />
      <Sparkline
        values={data.map((d) => d.avg_duration_min)}
        color="var(--brand-blue)"
        label="Tiempo medio"
        formatValue={(v) => `${Math.abs(v).toFixed(1)}m`}
        showMonths={months}
      />
    </div>
  )
}
