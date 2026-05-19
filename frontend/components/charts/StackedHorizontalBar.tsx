'use client'
import type { MDMOfficeItem } from '@/lib/types'

interface StackedHorizontalBarProps {
  data: MDMOfficeItem[]
}

export function StackedHorizontalBar({ data }: StackedHorizontalBarProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      MDM CORE 4 — Ranking por oficina (implementar con ECharts)
    </div>
  )
}
