'use client'
import type { MDMTimelineItem } from '@/lib/types'

interface StackedTemporalBarProps {
  data: MDMTimelineItem[]
}

export function StackedTemporalBar({ data }: StackedTemporalBarProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      MDM CORE 3 — Evolución temporal (implementar con ECharts)
    </div>
  )
}
