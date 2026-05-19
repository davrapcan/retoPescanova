'use client'

import { DashboardFiltersProvider } from '@/lib/filters'
import { DashboardHeader } from '@/components/ui/DashboardHeader'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardFiltersProvider>
      <DashboardHeader />
      <main className="px-4 pb-4 pt-2">{children}</main>
    </DashboardFiltersProvider>
  )
}
