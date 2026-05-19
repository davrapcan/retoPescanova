// Formatting utilities for display values

export function fmtPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function fmtInt(value: number): string {
  return value.toLocaleString('es-ES')
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function fmtDelta(delta: number | null | undefined): string {
  if (delta == null) return ''
  const sign = delta >= 0 ? '↑' : '↓'
  return `${sign} ${Math.abs(delta).toFixed(1)}%`
}

export function fmtMonth(iso: string): string {
  const [year, month] = iso.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`
}
