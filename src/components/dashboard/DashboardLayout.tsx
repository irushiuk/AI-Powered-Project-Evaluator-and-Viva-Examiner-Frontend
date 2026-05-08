"use client"

import { ReactNode } from "react"

type Props = {
  children: ReactNode
  activePage: string
  setActivePage: (page: string) => void
}

export default function DashboardLayout({
  children,
  activePage,
  setActivePage
}: Props) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">

        <h1 className="text-2xl font-bold mb-8">
          AI Viva
        </h1>

        <nav className="space-y-2 text-sm">

          <button
            onClick={() => setActivePage("dashboard")}
            className={`w-full text-left p-3 rounded-xl transition ${
              activePage === "dashboard"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActivePage("vivas")}
            className={`w-full text-left p-3 rounded-xl transition ${
              activePage === "vivas"
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            Vivas
          </button>

          <button
            className="w-full text-left p-3 rounded-xl hover:bg-gray-100 text-gray-600"
          >
            Analytics
          </button>

        </nav>

      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  )
}