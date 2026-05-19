'use client'
import type { TrainingDistributionItem } from '@/lib/types'

interface ScoreHistogramProps {
  data: TrainingDistributionItem[]
}

export function ScoreHistogram({ data }: ScoreHistogramProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      Training CORE 4a — Histograma score_pct (implementar con ECharts)
    </div>
  )
}
