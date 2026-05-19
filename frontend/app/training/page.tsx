import { EmptyState } from '@/components/ui/EmptyState'

export default function TrainingPage() {
  return (
    <div className="flex flex-col gap-2">
      <EmptyState
        title="Formación · Concienciación"
        description="Sube el XLSX de formación desde /upload para ver los datos."
      />
    </div>
  )
}
