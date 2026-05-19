'use client'
import type { TrainingOutlierItem } from '@/lib/types'

interface OutliersListProps {
  data: TrainingOutlierItem[]
}

export function OutliersList({ data }: OutliersListProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      Training CORE 4b — Lista de outliers (implementar)
    </div>
  )
}
