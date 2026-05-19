'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
}

export function Tabs({ tabs }: TabsProps) {
  const pathname = usePathname()
  return (
    <div className="flex gap-1">
      {tabs.map((tab) => {
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
    </div>
  )
}
