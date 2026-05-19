'use client'
import type { MDMPatchItem } from '@/lib/types'

interface TopPatchesListProps {
  data: MDMPatchItem[]
}

export function TopPatchesList({ data }: TopPatchesListProps) {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
      MDM CORE 2 — Top parches críticos (implementar)
    </div>
  )
}
