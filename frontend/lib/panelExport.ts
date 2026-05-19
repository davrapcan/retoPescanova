export function toCsv(data: unknown): string {
  if (data == null) return ''
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : typeof data === 'object'
      ? [data as Record<string, unknown>]
      : [{ value: data }]

  if (!rows.length) return ''

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => acc.add(k))
      }
      return acc
    }, new Set()),
  )

  const escape = (v: unknown): string => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row?.[h])).join(','))
  }
  return lines.join('\n')
}

export function downloadFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'panel'
}

export function formatRelativeTime(ts: number | null, now = Date.now()): string {
  if (!ts) return ''
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000))
  if (diffSec < 5) return 'ahora'
  if (diffSec < 60) return `hace ${diffSec}s`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}
