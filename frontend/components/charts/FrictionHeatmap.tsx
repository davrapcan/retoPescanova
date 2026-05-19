'use client'
import { useState, useCallback, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { TrainingFriction, TrainingFrictionCell } from '@/lib/types'

interface FrictionHeatmapProps {
  data: TrainingFriction
}

function frictionLabel(score: number): string {
  if (score > 60) return 'Alto'
  if (score > 30) return 'Medio'
  return 'Bajo'
}

export function FrictionHeatmap({ data }: FrictionHeatmapProps) {
  const [selected, setSelected] = useState<TrainingFrictionCell | null>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { cells, modules, countries } = data

  // Map full country name → ISO for axis labels
  const isoLabels = countries.map((c) => {
    const match = cells.find((cell) => cell.location === c)
    return match ? match.location_iso : c.slice(0, 2).toUpperCase()
  })

  // Build echarts data array: [x_idx, y_idx, value, opacity_value, cell_data]
  const chartData = cells
    .filter((c) => c.friction_score !== null)
    .map((c) => {
      const xIdx = countries.indexOf(c.location)
      const yIdx = modules.indexOf(c.module_name)
      if (xIdx === -1 || yIdx === -1) return null
      const opacity = c.low_sample ? 0.4 : Math.max(0.4, Math.min(1, c.user_count / 70))
      return {
        value: [xIdx, yIdx, c.friction_score ?? 0, opacity],
        cell: c,
      }
    })
    .filter(Boolean) as { value: number[]; cell: TrainingFrictionCell }[]

  const handleClick = useCallback(
    (params: { dataIndex: number }) => {
      const item = chartData[params.dataIndex]
      if (item) setSelected(item.cell)
    },
    [chartData]
  )

  const option = {
    grid: {
      top: 8,
      bottom: 60,
      left: 172,
      right: selected ? 220 : 16,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: isoLabels,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 10,
        color: '#005A9C',
        fontWeight: 600,
        interval: 0,
      },
    },
    yAxis: {
      type: 'category',
      data: modules,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 10,
        color: '#0F172A',
        width: 160,
        overflow: 'truncate',
        interval: 0,
      },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      show: true,
      orient: 'horizontal',
      left: 0,
      bottom: 0,
      itemWidth: 120,
      itemHeight: 8,
      text: ['Fricción alta', 'Baja'],
      textStyle: { fontSize: 9, color: '#94A3B8' },
      inRange: {
        color: ['#16A34A', '#F59E0B', '#DC2626'],
      },
    },
    series: [
      {
        name: 'Friction',
        type: 'heatmap',
        data: chartData.map((d) => ({
          value: d.value,
          itemStyle: { opacity: d.value[3] },
        })),
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 6,
            shadowColor: 'rgba(0,0,0,0.2)',
          },
        },
        tooltip: {
          formatter: (params: { dataIndex: number }) => {
            const item = chartData[params.dataIndex]
            if (!item) return ''
            const c = item.cell
            const friction = (c.friction_score ?? 0).toFixed(1)
            const incomplete = Math.round(c.incomplete_rate * 100)
            const level = frictionLabel(c.friction_score ?? 0)
            return [
              `<b>${c.module_name}</b> · ${c.location}`,
              `<span style="color:#64748B;font-size:11px">`,
              `Fricción: <b style="color:${(c.friction_score ?? 0) > 60 ? '#DC2626' : (c.friction_score ?? 0) > 30 ? '#F59E0B' : '#16A34A'}">${friction}</b> (${level})`,
              `Duración media: ${c.avg_duration_min.toFixed(1)} min`,
              `Sin completar: ${incomplete}%`,
              `Usuarios: ${c.user_count}${c.low_sample ? ' ⚠ muestra reducida' : ''}`,
              `</span>`,
            ].join('<br/>')
          },
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { fontSize: 11, color: '#0F172A' },
    },
  }

  if (!mounted) return <div className="w-full h-full" style={{ backgroundColor: '#F8FAFC' }} />

  return (
    <div className="w-full flex gap-3" style={{ minHeight: 0 }}>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '100%' }}
          onEvents={{ click: handleClick }}
          notMerge
        />
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="shrink-0 flex flex-col gap-2 rounded-lg"
          style={{
            width: '200px',
            border: '0.5px solid var(--border)',
            padding: '10px',
            backgroundColor: '#fff',
            alignSelf: 'flex-start',
          }}
        >
          <div className="flex items-start justify-between gap-1">
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {selected.module_name}
            </p>
            <button
              onClick={() => setSelected(null)}
              style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--brand-blue)', fontWeight: 500 }}>
            {selected.location} · {selected.location_iso}
          </p>
          <div className="flex flex-col gap-1.5" style={{ fontSize: '10px' }}>
            <Metric
              label="Fricción"
              value={`${(selected.friction_score ?? 0).toFixed(1)}`}
              color={
                (selected.friction_score ?? 0) > 60
                  ? 'var(--critical)'
                  : (selected.friction_score ?? 0) > 30
                  ? 'var(--warning)'
                  : 'var(--ok)'
              }
            />
            <Metric label="Duración media" value={`${selected.avg_duration_min.toFixed(1)} min`} />
            <Metric label="Sin completar" value={`${Math.round(selected.incomplete_rate * 100)}%`} />
            <Metric
              label="Usuarios"
              value={`${selected.user_count}${selected.low_sample ? ' ⚠' : ''}`}
              color={selected.low_sample ? 'var(--warning)' : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
