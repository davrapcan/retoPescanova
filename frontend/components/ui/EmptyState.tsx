interface EmptyStateProps {
  title?: string
  description?: string
  icon?: string
}

export function EmptyState({
  title = 'Sin datos',
  description = 'No hay datos disponibles para los filtros actuales.',
  icon = '📊',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <span className="text-3xl">{icon}</span>
      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  )
}
