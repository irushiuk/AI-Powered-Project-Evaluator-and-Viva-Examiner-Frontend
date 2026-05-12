"use client"

import { useRouter, usePathname } from "next/navigation"
import { ReactNode } from "react"

type Props = {
  children: ReactNode
}

const navItems = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard/teacher" },
  { key: "projects", label: "Projects", href: "/dashboard/teacher/projects" },
  { key: "submissions", label: "Submissions", href: "/dashboard/teacher/submissions" },
]

export default function DashboardLayout({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex flex-1">
      <aside className="w-64 bg-white border-r border-gray-200 p-5 lg:p-6">
        <h1 className="text-2xl font-bold mb-8">AI Viva</h1>
        <nav className="space-y-2 text-sm">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={`w-full text-left p-3 rounded-xl transition ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-5 lg:p-6">
        {children}
      </main>
    </div>
  )
}