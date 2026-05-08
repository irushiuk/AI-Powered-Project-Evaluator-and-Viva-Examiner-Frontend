"use client"

import { useState } from "react"

import CreateVivaModal from "@/components/dashboard/CreateVivaModal"
import DashboardLayout from "@/components/dashboard/DashboardLayout"

import { Viva } from "@/lib/vivaService"
import { Button } from "@/components/ui/button"

type CardProps = {
  title: string
  value: string | number
}

type GlassCardProps = {
  children: React.ReactNode
}

export default function TeacherDashboard() {

  const [open, setOpen] = useState(false)

  // which section is open
  const [activePage, setActivePage] = useState("dashboard")

  // mock viva storage
  const [vivas, setVivas] = useState<Viva[]>([])

  // create viva
  const handleCreateViva = async (data: Omit<Viva, "id">) => {

    const newViva: Viva = {
      id: crypto.randomUUID(),
      ...data,
    }

    setVivas((prev) => [...prev, newViva])
  }

  return (
    <DashboardLayout
      activePage={activePage}
      setActivePage={setActivePage}
    >

      {/* Modal */}
      <CreateVivaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreateViva}
      />

      {/* DASHBOARD PAGE */}
      {activePage === "dashboard" && (
        <>
          <h1 className="text-3xl font-bold mb-6">
            Teacher Dashboard
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <Card title="Total Students" value="120" />
            <Card title="Active Vivas" value={vivas.length} />
            <Card title="Evaluated" value="56" />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-6">

            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">
                Create New Viva
              </h2>

              <p className="opacity-70 mb-4">
                Upload questions and configure AI evaluation
              </p>

              <Button
                onClick={() => setOpen(true)}
              >
                Create
              </Button>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">
                Review Submissions
              </h2>

              <p className="opacity-70 mb-4">
                Check AI feedback & grade students
              </p>

              <Button>
                Review
              </Button>
            </GlassCard>

          </div>
        </>
      )}

      {/* VIVAS PAGE */}
      {activePage === "vivas" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">
              Created Vivas
            </h1>

            <Button
              onClick={() => setOpen(true)}
            >
              + Create Viva
            </Button>
          </div>

          {vivas.length === 0 ? (
            <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
              No vivas created yet
            </div>
          ) : (
            <div className="grid gap-4">

              {vivas.map((viva) => (
                <div
                  key={viva.id}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                >
                  <h2 className="text-xl font-semibold">
                    {viva.module}
                  </h2>

                  <p className="text-gray-600 mt-2">
                    Duration: {viva.duration} mins
                  </p>
                </div>
              ))}

            </div>
          )}
        </>
      )}

    </DashboardLayout>
  )
}

/* Components */

function Card({ title, value }: CardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <p className="opacity-70">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  )
}

function GlassCard({ children }: GlassCardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
      {children}
    </div>
  )
}