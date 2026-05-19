'use client'
import ReactECharts from 'echarts-for-react'
import type { MDMTimelineItem } from '@/lib/types'
import { chartPalette } from '@/lib/theme'

interface StackedTemporalBarProps {
  data: MDMTimelineItem[]
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} may`
}

export function StackedTemporalBar({ data }: StackedTemporalBarProps) {
  const dates = data.map((d) => fmtDate(d.date))

  const option = {
    animation: false,
    grid: { top: 28, right: 8, bottom: 24, left: 40 },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 9, color: '#64748B' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { fontSize: 9, color: '#64748B' },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 9, color: '#64748B' },
      splitLine: { lineStyle: { color: '#E2E8F0', type: 'dashed' } },
    },
    series: [
      {
        name: 'Installed',
        type: 'bar',
        stack: 'total',
        data: data.map((d) => d.installed),
        itemStyle: { color: chartPalette.mdm.completed },
      },
      {
        name: 'Delay',
        type: 'bar',
        stack: 'total',
        data: data.map((d) => d.delay_in_deployment),
        itemStyle: { color: chartPalette.mdm.missing },
      },
      {
        name: 'Reboot',
        type: 'bar',
        stack: 'total',
        data: data.map((d) => d.reboot_pending),
        itemStyle: { color: chartPalette.mdm.inProgress },
      },
      {
        name: 'Failed',
        type: 'bar',
        stack: 'total',
        data: data.map((d) => d.failed),
        itemStyle: { color: chartPalette.mdm.failed },
      },
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
