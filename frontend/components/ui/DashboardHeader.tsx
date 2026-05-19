'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/mdm', label: 'MDM · Parches' },
  { href: '/training', label: 'Formación' },
  { href: '/upload', label: 'Cargar datos' },
]

export function DashboardHeader() {
  const pathname = usePathname()

  return (
    <header
      className="flex items-center gap-6 px-4 py-2 bg-white border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center justify-center w-7 h-7 rounded text-white font-bold text-xs"
          style={{ backgroundColor: 'var(--brand-red)' }}
        >
          P
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cyber Risk Cockpit
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 self-center" style={{ backgroundColor: 'var(--border)' }} />

      {/* Tabs */}
      <nav className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--brand-blue)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
