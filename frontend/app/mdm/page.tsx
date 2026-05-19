'use client'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
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

type StatusKey = 'completed' | 'missing' | 'in_progress' | 'failed'

export default function MDMPage() {
  const [activeStatus, setActiveStatus] = useState<StatusKey | null>(null)

  const banner     = useMDMBanner()
  const kpis       = useMDMKpis()
  const byOffice   = useMDMByOffice()
  const topPatches = useMDMTopPatches()
  const timeline   = useMDMTimeline()

  const filteredByOffice = useMemo(() => {
    if (!byOffice.data) return null
    if (!activeStatus) return byOffice.data
    return byOffice.data.filter((o) => o[activeStatus] > 0)
  }, [byOffice.data, activeStatus])

  function toggleStatus(s: StatusKey) {
    setActiveStatus((prev) => (prev === s ? null : s))
  }

  return (
    <div
      className="flex flex-col gap-1.5"
      style={{ height: 'calc(100vh - 90px)', overflow: 'hidden' }}
    >
      {/* ── Risk Banner ──────────────────────────────────────────── */}
      <div className="shrink-0">
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
      <div className="shrink-0">
        {kpis.loading ? (
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px]" />)}
          </div>
        ) : kpis.data ? (
          <div className="grid grid-cols-4 gap-1.5">
            <KPICard
              label="Patching Completed"
              value={kpis.data.completed}
              subtitle={`${kpis.data.completed_pct.toFixed(1)}% del parque`}
              severity="ok"
              active={activeStatus === 'completed'}
              onClick={() => toggleStatus('completed')}
            />
            <KPICard
              label="Patches Missing"
              value={kpis.data.missing}
              subtitle={`${kpis.data.missing_pct.toFixed(1)}% del parque`}
              severity="warning"
              active={activeStatus === 'missing'}
              onClick={() => toggleStatus('missing')}
            />
            <KPICard
              label="Patching In Progress"
              value={kpis.data.in_progress}
              subtitle={`${kpis.data.in_progress_pct.toFixed(1)}% del parque`}
              active={activeStatus === 'in_progress'}
              onClick={() => toggleStatus('in_progress')}
            />
            <KPICard
              label="Patching Failed"
              value={kpis.data.failed}
              subtitle={`${kpis.data.failed_pct.toFixed(1)}% del parque`}
              severity="critical"
              active={activeStatus === 'failed'}
              onClick={() => toggleStatus('failed')}
            />
          </div>
        ) : null}
      </div>

      {/* ── Middle Grid: Office Bar | Top Patches (takes remaining space) */}
      <div
        className="grid gap-1.5 min-h-0 flex-1"
        style={{ gridTemplateColumns: '3fr 2fr' }}
      >
        {/* CORE 4 — Ranking por Remote Office */}
        <Card
          title="¿qué oficinas concentran más riesgo?"
          extra={<LegendDots items={MDM_LEGEND} />}
        >
          {byOffice.loading ? (
            <Skeleton className="h-full" />
          ) : filteredByOffice && filteredByOffice.length > 0 ? (
            <StackedHorizontalBar data={filteredByOffice} />
          ) : (
            <EmptyState
              title="Sin datos"
              description="No hay oficinas para el filtro activo."
            />
          )}
        </Card>

        {/* CORE 2 — Top parches críticos */}
        <Card title="¿qué parches hay que aplicar primero?">
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
      <div className="shrink-0" style={{ height: '200px' }}>
        <Card title="¿cómo evoluciona el despliegue diario?" className="h-full">
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
