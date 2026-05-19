import type { Severity } from '@/lib/theme'
import { severityBg, severityBorder, severityColor } from '@/lib/theme'

const ICONS: Record<Severity, string> = {
  critical: '⚠',
  warning: '⚠',
  ok: '✓',
}

interface RiskBannerProps {
  severity: Severity
  title: string
  description?: string
}

export function RiskBanner({ severity, title, description }: RiskBannerProps) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 rounded-lg text-sm"
      style={{
        backgroundColor: severityBg[severity],
        border: `0.5px solid ${severityBorder[severity]}`,
      }}
    >
      <span style={{ color: severityColor[severity], fontSize: '14px', marginTop: '1px' }}>
        {ICONS[severity]}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="font-medium" style={{ color: severityColor[severity], fontSize: '12px' }}>
          {title}
        </span>
        {description && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{description}</span>
        )}
      </div>
    </div>
  )
}
