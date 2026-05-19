import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export default function MDMPage() {
  return (
    <div className="flex flex-col gap-2">
      <EmptyState
        title="MDM · Parches"
        description="Sube el XLSX de ManageEngine desde /upload para ver los datos."
      />
    </div>
  )
}
