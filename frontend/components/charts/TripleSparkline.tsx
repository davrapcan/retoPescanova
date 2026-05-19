'use client'
import type { TrainingTimelineItem } from '@/lib/types'

interface TripleSparklineProps {
  data: TrainingTimelineItem[]
}

export function TripleSparkline({ data }: TripleSparklineProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      Training CORE 2 — 3 sparklines temporales (implementar con ECharts)
    </div>
  )
}
