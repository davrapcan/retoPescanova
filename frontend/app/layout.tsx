import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DashboardHeader } from '@/components/ui/DashboardHeader'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export const metadata: Metadata = {
  title: 'Pescanova Cyber Risk Cockpit',
  description: 'Cuadro de mando de ciberseguridad para Nueva Pescanova',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <DashboardHeader />
        <main className="px-4 pb-4 pt-2">{children}</main>
      </body>
    </html>
  )
}
