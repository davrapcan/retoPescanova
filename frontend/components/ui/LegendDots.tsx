interface LegendItem {
  color: string
  label: string
}

interface LegendDotsProps {
  items: LegendItem[]
  className?: string
}

export function LegendDots({ items, className = '' }: LegendDotsProps) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
