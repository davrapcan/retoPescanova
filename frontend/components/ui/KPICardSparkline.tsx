import type { Severity } from '@/lib/theme'
import { KPICard } from './KPICard'

interface KPICardSparklineProps {
  label: string
  value: string | number
  subtitle?: string
  delta?: string
  severity?: Severity
  sparklineData?: number[]
  sparklineColor?: string
}

export function KPICardSparkline({ sparklineData, sparklineColor, ...rest }: KPICardSparklineProps) {
  return (
    <KPICard {...rest}>
      {sparklineData && sparklineData.length > 1 && (
        <svg width="100%" height="24" viewBox={`0 0 ${sparklineData.length * 10} 24`} preserveAspectRatio="none">
          <polyline
            points={sparklineData
              .map((v, i) => {
                const max = Math.max(...sparklineData)
                const min = Math.min(...sparklineData)
                const range = max - min || 1
                const x = i * 10
                const y = 22 - ((v - min) / range) * 20
                return `${x},${y}`
              })
              .join(' ')}
            fill="none"
            stroke={sparklineColor ?? 'var(--brand-blue)'}
            strokeWidth="1.5"
          />
        </svg>
      )}
    </KPICard>
  )
}
