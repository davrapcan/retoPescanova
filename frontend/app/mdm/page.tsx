'use client'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { KPICard } from '@/components/ui/KPICard'
import { RiskBanner } from '@/components/ui/RiskBanner'
import { EmptyState } from '@/components/ui/EmptyState'
import { LegendDots } from '@/components/ui/LegendDots'
import {
  useMDMBanner,
  useMDMByOffice,
  useMDMKpis,
  useMDMTimeline,
  useMDMTopPatches,
} from '@/hooks/useMDM'
import { chartPalette } from '@/lib/theme'
import { useDashboardFilters, type StatusKey } from '@/lib/filters'

const StackedHorizontalBar = dynamic(
  () => import('@/components/charts/StackedHorizontalBar').then((m) => m.StackedHorizontalBar),
  { ssr: false },
)
const StackedTemporalBar = dynamic(
  () => import('@/components/charts/StackedTemporalBar').then((m) => m.StackedTemporalBar),
  { ssr: false },
)
const TopPatchesList = dynamic(
  () => import('@/components/charts/TopPatchesList').then((m) => m.TopPatchesList),
  { ssr: false },
)

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />
}

const MDM_LEGEND = [
  { color: chartPalette.mdm.completed,  label: 'Completed' },
  { color: chartPalette.mdm.missing,    label: 'Missing' },
  { color: chartPalette.mdm.inProgress, label: 'In Progress' },
  { color: chartPalette.mdm.failed,     label: 'Failed' },
]

export default function MDMPage() {
  const { status, toggleStatus, office, setOffice } = useDashboardFilters()

  const banner     = useMDMBanner()
  const kpis       = useMDMKpis()
  const byOffice   = useMDMByOffice()
  const topPatches = useMDMTopPatches()
  const timeline   = useMDMTimeline()

  const filteredByOffice = useMemo(() => {
    if (!byOffice.data) return null
    if (!status) return byOffice.data
    return byOffice.data.filter((o) => o[status] > 0)
  }, [byOffice.data, status])

  // KPIs derived from the selected office when an office filter is active.
  // The backend /kpis endpoint doesn't accept `office`, so we aggregate locally.
  const officeKpis = useMemo(() => {
    if (!office || !byOffice.data) return null
    const row = byOffice.data.find((o) => o.office === office)
    if (!row) return null
    const total = row.total || 1
    return {
      completed: row.completed,
      missing: row.missing,
      in_progress: row.in_progress,
      failed: row.failed,
      total: row.total,
      completed_pct: (row.completed / total) * 100,
      missing_pct: (row.missing / total) * 100,
      in_progress_pct: (row.in_progress / total) * 100,
      failed_pct: (row.failed / total) * 100,
    }
  }, [office, byOffice.data])

  const displayedKpis = officeKpis ?? kpis.data
  const kpiScopeLabel = office ? `de ${office}` : 'del parque'

  return (
    <div
      className="grid gap-1.5"
      style={{
        gridTemplateRows: 'auto auto 360px 260px',
      }}
    >
      {/* ── Risk Banner ──────────────────────────────────────────── */}
      <div>
        {banner.loading ? (
          <Skeleton className="h-10" />
        ) : banner.data ? (
          <RiskBanner
            severity={banner.data.severity}
            title={banner.data.title}
            description={banner.data.description}
          />
        ) : null}
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div>
        {kpis.loading ? (
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px]" />)}
          </div>
        ) : displayedKpis ? (
          <div className="grid grid-cols-4 gap-1.5">
            <KPICard
              label="Patching Completed"
              value={displayedKpis.completed}
              subtitle={`${displayedKpis.completed_pct.toFixed(1)}% ${kpiScopeLabel}`}
              severity="ok"
              active={status === 'completed'}
              onClick={() => toggleStatus('completed' as StatusKey)}
            />
            <KPICard
              label="Patches Missing"
              value={displayedKpis.missing}
              subtitle={`${displayedKpis.missing_pct.toFixed(1)}% ${kpiScopeLabel}`}
              severity="warning"
              active={status === 'missing'}
              onClick={() => toggleStatus('missing' as StatusKey)}
            />
            <KPICard
              label="Patching In Progress"
              value={displayedKpis.in_progress}
              subtitle={`${displayedKpis.in_progress_pct.toFixed(1)}% ${kpiScopeLabel}`}
              active={status === 'in_progress'}
              onClick={() => toggleStatus('in_progress' as StatusKey)}
            />
            <KPICard
              label="Patching Failed"
              value={displayedKpis.failed}
              subtitle={`${displayedKpis.failed_pct.toFixed(1)}% ${kpiScopeLabel}`}
              severity="critical"
              active={status === 'failed'}
              onClick={() => toggleStatus('failed' as StatusKey)}
            />
          </div>
        ) : null}
      </div>

      {/* ── Middle Grid: Office Bar | Top Patches (takes remaining space) */}
      <div className="grid gap-1.5 min-h-0" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* CORE 4 — Ranking por Remote Office */}
        <Card
          title="¿qué oficinas concentran más riesgo?"
          extra={<LegendDots items={MDM_LEGEND} />}
          inspectData={filteredByOffice}
          lastUpdated={byOffice.lastUpdated}
          panelId="mdm-offices"
        >
          {byOffice.loading ? (
            <Skeleton className="h-full" />
          ) : filteredByOffice && filteredByOffice.length > 0 ? (
            <StackedHorizontalBar
              data={filteredByOffice}
              activeOffice={office}
              onSelect={(o) => setOffice(office === o.office ? undefined : o.office)}
            />
          ) : (
            <EmptyState
              title="Sin datos"
              description="No hay oficinas para el filtro activo."
            />
          )}
        </Card>

        {/* CORE 2 — Top parches críticos */}
        <Card
          title="¿qué parches hay que aplicar primero?"
          inspectData={topPatches.data}
          lastUpdated={topPatches.lastUpdated}
          panelId="mdm-top-patches"
        >
          {topPatches.loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : topPatches.data && topPatches.data.length > 0 ? (
            <TopPatchesList data={topPatches.data} />
          ) : (
            <EmptyState title="Sin parches" description="No hay parches críticos registrados." />
          )}
        </Card>
      </div>

      {/* ── CORE 3 — Evolución temporal ──────────────────────────── */}
      <div>
        <Card
          title="¿cómo evoluciona el despliegue diario?"
          className="h-full"
          inspectData={timeline.data}
          lastUpdated={timeline.lastUpdated}
          panelId="mdm-timeline"
        >
          {timeline.loading ? (
            <Skeleton className="h-full" />
          ) : timeline.data && timeline.data.length > 0 ? (
            <StackedTemporalBar data={timeline.data} />
          ) : (
            <EmptyState title="Sin datos temporales" description="No hay eventos registrados." />
          )}
        </Card>
      </div>
    </div>
  )
}
