// Design tokens — derived from MVP_SPEC.md section 2

export const colors = {
  brandRed: '#E30613',
  brandBlue: '#005A9C',
  ok: '#16A34A',
  warning: '#F59E0B',
  critical: '#DC2626',
  bgPage: '#F8FAFC',
  bgCard: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
} as const

export type Severity = 'ok' | 'warning' | 'critical'

export const severityColor: Record<Severity, string> = {
  ok: colors.ok,
  warning: colors.warning,
  critical: colors.critical,
}

export const severityBg: Record<Severity, string> = {
  ok: '#F0FDF4',
  warning: '#FFFBEB',
  critical: '#FEF2F2',
}

export const severityBorder: Record<Severity, string> = {
  ok: '#BBF7D0',
  warning: '#FDE68A',
  critical: '#FECACA',
}

export const typography = {
  fontFamily: 'Inter, sans-serif',
  kpiSize: '28px',
  kpiFontWeight: '500',
  cardTitleSize: '12px',
  cardTitleWeight: '500',
  labelSize: '10px',
  labelTracking: '0.5px',
  chartTextSize: '9px',
  bannerSize: '12px',
  bannerWeight: '500',
} as const

export const spacing = {
  cardPadding: '12px',
  cardGap: '8px',
  borderRadius: '8px',
  borderRadiusSm: '6px',
  border: `0.5px solid ${colors.border}`,
} as const

// Thresholds for business logic — single source of truth for frontend
export const thresholds = {
  mdm: {
    failedCritical: 0,       // failed_count > 0 → critical banner
    missingWarningPct: 0.10, // missing > 10% of total → warning banner
  },
  training: {
    scoreRed: 15,            // country avg_score_pct < 15% → red
    scoreAmber: 25,          // country avg_score_pct 15–25% → amber
    completionRed: 60,       // country completion_rate < 60% → red
    completionAmber: 80,     // country completion_rate 60–80% → amber
    frictionRed: 60,         // friction_score > 60 → red
    frictionAmber: 30,       // friction_score 30–60 → amber
    globalCompletionCritical: 50, // global < 50% → critical banner
    globalCompletionWarning: 70,  // global < 70% → warning banner
    minUsersForBanner: 20,   // country needs >20 users to appear in banner
    scoreHistoCritical: 20,  // score_pct < 20% → red bin
    scoreHistoWarning: 40,   // score_pct 20–40% → amber bin
  },
  training_outliers: {
    durationPercentile: 90,  // duration > p90 is "high"
    scoreThreshold: 30,      // score_pct < 30 is "low"
  },
} as const

// ECharts color palette for stacked bar consistency
export const chartPalette = {
  mdm: {
    completed: colors.ok,
    missing: colors.warning,
    inProgress: colors.brandBlue,
    failed: colors.critical,
  },
  frictionGradient: ['#16A34A', '#F59E0B', '#DC2626'] as string[],
} as const
