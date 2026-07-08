import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="h-screen w-screen overflow-hidden bg-slate-950">
        {children}
      </div>
    </ProtectedRoute>
  )
}
