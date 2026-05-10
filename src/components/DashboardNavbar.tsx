'use client'

import Link from 'next/link'
import { GraduationCap, LogOut } from 'lucide-react'

export function DashboardNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <nav className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg text-gray-900">VivaSense</span>
        </Link>

       

        <button className="flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </nav>
    </header>
  )
}