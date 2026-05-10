import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { DashboardNavbar } from '@/components/DashboardNavbar'

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      <DashboardNavbar />
      <div className="flex flex-1">{children}</div>
      <Footer />
    </div>
  )
}