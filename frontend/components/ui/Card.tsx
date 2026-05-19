interface CardProps {
  title?: string
  className?: string
  children: React.ReactNode
}

export function Card({ title, className = '', children }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg ${className}`}
      style={{ border: '0.5px solid var(--border)', padding: '10px', overflow: 'hidden' }}
    >
      {title && (
        <p
          className="uppercase font-medium mb-2"
          style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
