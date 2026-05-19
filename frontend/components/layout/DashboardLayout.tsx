interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col gap-2 w-full" style={{ minHeight: 'calc(100vh - 48px)' }}>
      {children}
    </div>
  )
}
