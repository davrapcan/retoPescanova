'use client'
import type { TrainingCountryItem } from '@/lib/types'

interface CountryDoubleBarProps {
  data: TrainingCountryItem[]
}

export function CountryDoubleBar({ data }: CountryDoubleBarProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      Training CORE 1 — Países: finalización + score (implementar con ECharts)
    </div>
  )
}
