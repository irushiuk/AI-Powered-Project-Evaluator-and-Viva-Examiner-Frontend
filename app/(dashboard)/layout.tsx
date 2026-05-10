import { DashboardFooter } from '@/components/DashboardFooter'
import { DashboardNavbar } from '@/components/DashboardNavbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNavbar />

      {/* Main Content */}
      <main className="mx-auto flex-1 w-full max-w-full px-4 sm:px-5 lg:px-12 py-6">
        {children}
      </main>

      <DashboardFooter />
    </div>
  )
}
