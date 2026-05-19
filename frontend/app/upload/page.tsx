import { Card } from '@/components/ui/Card'

export default function UploadPage() {
  return (
    <div className="max-w-lg mx-auto mt-8">
      <Card>
        <h2 className="text-sm font-medium text-text-primary mb-4">Cargar datos</h2>
        <p className="text-xs text-text-secondary">
          Drag-and-drop de XLSX — implementar en C1.
        </p>
      </Card>
    </div>
  )
}
