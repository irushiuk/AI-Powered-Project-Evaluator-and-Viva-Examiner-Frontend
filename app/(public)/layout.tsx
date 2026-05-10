import type { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'
import { LandingFooter } from '@/components/LandingFooter'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
