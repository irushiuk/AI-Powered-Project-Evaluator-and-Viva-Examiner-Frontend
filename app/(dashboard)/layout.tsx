import { DashboardFooter } from '@/components/DashboardFooter'
import { DashboardNavbar } from '@/components/DashboardNavbar'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardNavbar />

        {/* Main Content */}
        <main className="mx-auto flex-1 w-full max-w-full px-4 sm:px-5 lg:px-12 py-6">
          {children}
        </main>

        <DashboardFooter />
      </div>
    </ProtectedRoute>
  )
}
