interface CardProps {
  title?: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function Card({ title, className = '', children, onClick }: CardProps) {
  const clickable = !!onClick
  return (
    <div
      className={`bg-white rounded-lg flex flex-col ${clickable ? 'card-clickable' : ''} ${className}`}
      style={{
        border: '0.5px solid var(--border)',
        padding: '10px',
        overflow: 'hidden',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick!()
              }
            }
          : undefined
      }
    >
      {title && (
        <p
          className="uppercase font-medium mb-2 shrink-0 flex items-center justify-between"
          style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
        >
          <span>{title}</span>
          {clickable && (
            <span style={{ fontSize: '11px', color: 'var(--brand-blue)', textTransform: 'none', letterSpacing: 0 }}>
              Ver detalle →
            </span>
          )}
        </p>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}
