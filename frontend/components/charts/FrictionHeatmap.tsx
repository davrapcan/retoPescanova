'use client'
import type { TrainingFriction } from '@/lib/types'

interface FrictionHeatmapProps {
  data: TrainingFriction
}

export function FrictionHeatmap({ data }: FrictionHeatmapProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      Training CORE 3 — Heatmap de fricción módulo×país (implementar con ECharts)
    </div>
  )
}
