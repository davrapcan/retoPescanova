'use client'

import { Suspense } from 'react'
import { DashboardFiltersProvider } from '@/lib/filters'
import { DashboardHeader } from '@/components/ui/DashboardHeader'

function ShellInner({ children }: { children: React.ReactNode }) {
  return (
    <DashboardFiltersProvider>
      <DashboardHeader />
      <main className="px-4 pb-4 pt-2">{children}</main>
    </DashboardFiltersProvider>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="px-4 pb-4 pt-2" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  )
}
