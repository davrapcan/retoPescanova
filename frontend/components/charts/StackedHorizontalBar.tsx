'use client'
import ReactECharts from 'echarts-for-react'
import type { MDMOfficeItem } from '@/lib/types'
import { chartPalette } from '@/lib/theme'

interface StackedHorizontalBarProps {
  data: MDMOfficeItem[]
}

export function StackedHorizontalBar({ data }: StackedHorizontalBarProps) {
  // Sort descending by total; inverse: true puts index 0 at the top
  const sorted = [...data].sort((a, b) => b.total - a.total)
  const labels = sorted.map((o) => `${o.office_code} (${o.total})`)

  type FieldKey = 'completed' | 'missing' | 'in_progress' | 'failed'
  const vals = (f: FieldKey) => sorted.map((o) => o[f])

  const option = {
    animation: false,
    grid: { top: 4, right: 8, bottom: 4, left: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params: { dataIndex: number }[]) {
        const o = sorted[params[0]?.dataIndex ?? 0]
        if (!o) return ''
        return [
          `<b style="font-size:11px">${o.office}</b>`,
          `<span style="color:#16A34A">■</span> Completed: <b>${o.completed}</b>`,
          `<span style="color:#F59E0B">■</span> Missing: <b>${o.missing}</b>`,
          `<span style="color:#005A9C">■</span> In Progress: <b>${o.in_progress}</b>`,
          `<span style="color:#DC2626">■</span> Failed: <b>${o.failed}</b>`,
          `Total: <b>${o.total}</b>`,
        ].join('<br/>')
      },
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: labels,
      inverse: true,
      axisLabel: { fontSize: 9, color: '#64748B' },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      { name: 'Completed',   type: 'bar', stack: 'total', data: vals('completed'),   itemStyle: { color: chartPalette.mdm.completed },   barMaxWidth: 16 },
      { name: 'Missing',     type: 'bar', stack: 'total', data: vals('missing'),     itemStyle: { color: chartPalette.mdm.missing },     barMaxWidth: 16 },
      { name: 'In Progress', type: 'bar', stack: 'total', data: vals('in_progress'), itemStyle: { color: chartPalette.mdm.inProgress },  barMaxWidth: 16 },
      { name: 'Failed',      type: 'bar', stack: 'total', data: vals('failed'),      itemStyle: { color: chartPalette.mdm.failed },      barMaxWidth: 16 },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  )
}
