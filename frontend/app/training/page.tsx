'use client'
import { Card } from '@/components/ui/Card'
import { KPICard } from '@/components/ui/KPICard'
import { RiskBanner } from '@/components/ui/RiskBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountryDoubleBar } from '@/components/charts/CountryDoubleBar'
import { TripleSparkline } from '@/components/charts/TripleSparkline'
import { FrictionHeatmap } from '@/components/charts/FrictionHeatmap'
import { ScoreHistogram } from '@/components/charts/ScoreHistogram'
import { OutliersList } from '@/components/charts/OutliersList'
import {
  useTrainingKpis,
  useTrainingBanner,
  useTrainingByCountry,
  useTrainingTimeline,
  useTrainingFriction,
  useTrainingDistribution,
  useTrainingOutliers,
} from '@/hooks/useTraining'
import type { Severity } from '@/lib/theme'

function Skeleton({ h = 'h-8', full = false }: { h?: string; full?: boolean }) {
  return (
    <div
      className={`rounded animate-pulse ${full ? 'w-full h-full' : `w-full ${h}`}`}
      style={{ backgroundColor: '#E2E8F0', minHeight: full ? 0 : undefined }}
    />
  )
}

export default function TrainingPage() {
  const kpis         = useTrainingKpis()
  const banner       = useTrainingBanner()
  const byCountry    = useTrainingByCountry()
  const timeline     = useTrainingTimeline()
  const friction     = useTrainingFriction()
  const distribution = useTrainingDistribution()
  const outliers     = useTrainingOutliers(4)

  const kd = kpis.data
  const bd = banner.data

  const completionSeverity = (): Severity => {
    if (!kd) return 'warning'
    if (kd.completion_rate * 100 < 50) return 'critical'
    if (kd.completion_rate * 100 < 70) return 'warning'
    return 'ok'
  }

  const scoreSeverity = (): Severity => {
    if (!kd) return 'warning'
    if (kd.avg_score_pct < 15) return 'critical'
    if (kd.avg_score_pct < 25) return 'warning'
    return 'ok'
  }

  return (
    <div
      className="flex flex-col"
      style={{ gap: '6px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}
    >
      {/* ── Risk Banner ── */}
      <div className="shrink-0">
        {banner.loading ? (
          <Skeleton h="h-9" />
        ) : bd ? (
          <RiskBanner severity={bd.severity} title={bd.title} description={bd.description} />
        ) : null}
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="grid grid-cols-4 shrink-0" style={{ gap: '6px' }}>
        {kpis.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="h-[72px]" />)
        ) : kd ? (
          <>
            <KPICard
              label="Usuarios"
              value={kd.total_users.toLocaleString('es-ES')}
              subtitle={`${kd.total_countries} países · ${kd.total_modules} módulos`}
            />
            <KPICard
              label="Finalización"
              value={`${Math.round(kd.completion_rate * 100)}%`}
              delta={
                kd.completion_rate_delta != null
                  ? `${kd.completion_rate_delta >= 0 ? '+' : ''}${(kd.completion_rate_delta * 100).toFixed(1)}% vs mes anterior`
                  : undefined
              }
              severity={completionSeverity()}
            />
            <KPICard
              label="Score medio"
              value={`${kd.avg_score_pct.toFixed(1)}%`}
              subtitle="obj. 80%"
              severity={scoreSeverity()}
            />
            <KPICard
              label="Tiempo medio"
              value={`${kd.avg_duration_min.toFixed(1)} min`}
              delta={
                kd.avg_duration_delta != null
                  ? `${kd.avg_duration_delta >= 0 ? '+' : ''}${kd.avg_duration_delta.toFixed(1)} min vs anterior`
                  : undefined
              }
            />
          </>
        ) : (
          <div className="col-span-4">
            <EmptyState description="Sin datos. Sube el XLSX de formación." />
          </div>
        )}
      </div>

      {/* ── Row 2: Countries + Timeline — fixed height ── */}
      <div className="grid grid-cols-2 shrink-0" style={{ gap: '6px', height: '180px' }}>
        <Card title="¿Qué países están en riesgo formativo?">
          {byCountry.loading ? (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h="h-3" />)}
            </div>
          ) : byCountry.data?.length ? (
            <div style={{ overflowY: 'auto', maxHeight: '128px' }}>
              <CountryDoubleBar data={byCountry.data} />
            </div>
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card title="¿Mejora la formación mes a mes?">
          {timeline.loading ? (
            <div className="flex flex-col gap-3 pt-1">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h="h-5" />)}
            </div>
          ) : timeline.data?.length ? (
            <TripleSparkline data={timeline.data} />
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      {/* ── Row 3: Heatmap protagonista — fixed height ── */}
      <div className="shrink-0" style={{ height: '210px' }}>
        <Card title="¿Qué módulos generan más fricción por país?" className="h-full">
          {friction.loading ? (
            <Skeleton full />
          ) : friction.data ? (
            <FrictionHeatmap data={friction.data} />
          ) : (
            <EmptyState description="Sin datos de fricción. Sube el XLSX de formación." />
          )}
        </Card>
      </div>

      {/* ── Row 4: Histogram + Outliers — fills remaining space ── */}
      <div className="grid grid-cols-2 flex-1 min-h-0" style={{ gap: '6px' }}>
        <Card title="¿Cómo se distribuye el score?" className="h-full">
          {distribution.loading ? (
            <Skeleton full />
          ) : distribution.data?.length ? (
            <ScoreHistogram data={distribution.data} />
          ) : (
            <EmptyState />
          )}
        </Card>

        <Card title="¿Quién invierte más tiempo con peor resultado?" className="h-full">
          <div className="h-full overflow-y-auto">
            {outliers.loading ? (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="h-10" />)}
              </div>
            ) : outliers.data?.length ? (
              <OutliersList data={outliers.data} />
            ) : (
              <EmptyState />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
