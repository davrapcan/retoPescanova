import type { Severity } from '@/lib/theme'
import { severityColor } from '@/lib/theme'

interface KPICardProps {
  label: string
  value: string | number
  subtitle?: string
  delta?: string
  severity?: Severity
  onClick?: () => void
  active?: boolean
  children?: React.ReactNode
}

export function KPICard({
  label,
  value,
  subtitle,
  delta,
  severity,
  onClick,
  active,
  children,
}: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className="relative flex flex-col gap-1 p-3 bg-white rounded-lg"
      style={{
        border: '0.5px solid var(--border)',
        borderTop: severity ? `3px solid ${severityColor[severity]}` : '0.5px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        outline: active ? `2px solid ${severity ? severityColor[severity] : 'var(--brand-blue)'}` : 'none',
      }}
    >
      <span
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.5px', fontSize: '10px' }}
      >
        {label}
      </span>
      <span className="font-medium leading-none" style={{ fontSize: '28px', color: 'var(--text-primary)' }}>
        {value}
      </span>
      {subtitle && (
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{subtitle}</span>
      )}
      {delta && (
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{delta}</span>
      )}
      {children}
    </div>
  )
}
