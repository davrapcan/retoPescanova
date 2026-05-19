'use client'
import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { TrainingDistributionItem } from '@/lib/types'
import { thresholds } from '@/lib/theme'

interface ScoreHistogramProps {
  data: TrainingDistributionItem[]
}

function binColor(binStart: number): string {
  if (binStart < thresholds.training.scoreHistoCritical) return '#DC2626'
  if (binStart < thresholds.training.scoreHistoWarning)  return '#F59E0B'
  return '#16A34A'
}

export function ScoreHistogram({ data }: ScoreHistogramProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!data.length) return null
  if (!mounted) return <div className="w-full h-full" style={{ backgroundColor: '#F8FAFC' }} />

  const criticalCount = data
    .filter((d) => d.bin_start < thresholds.training.scoreHistoCritical)
    .reduce((s, d) => s + d.count, 0)

  const option = {
    grid: { top: 8, bottom: 28, left: 32, right: 8, containLabel: false },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 8,
        color: '#94A3B8',
        interval: 1,
        rotate: 0,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 8, color: '#94A3B8' },
      splitLine: { lineStyle: { color: '#E2E8F0', width: 0.5 } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#E2E8F0',
      borderWidth: 1,
      padding: [6, 10],
      textStyle: { fontSize: 11, color: '#0F172A' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `<b>${p.name}</b><br/>Usuarios: <b>${p.value}</b>`
      },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => ({
          value: d.count,
          itemStyle: { color: binColor(d.bin_start), borderRadius: [2, 2, 0, 0] },
        })),
        barMaxWidth: 28,
        emphasis: { itemStyle: { opacity: 0.8 } },
      },
    ],
  }

  return (
    <div className="flex flex-col w-full h-full" style={{ minHeight: 0 }}>
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ReactECharts
          option={option}
          style={{ width: '100%', height: '100%' }}
          notMerge
        />
      </div>
      <p
        className="mt-1 shrink-0"
        style={{ fontSize: '10px', color: 'var(--critical)', fontWeight: 500 }}
      >
        {criticalCount.toLocaleString('es-ES')} usuarios en zona crítica (score &lt;20%)
      </p>
    </div>
  )
}
