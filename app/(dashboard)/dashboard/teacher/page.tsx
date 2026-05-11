"use client"

import { useState, useEffect } from "react"
import CreateVivaModal from "@/components/dashboard/CreateVivaModal"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Viva } from "@/types/viva"
import { vivaService } from "@/services/vivaService"
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
  const [editingViva, setEditingViva] = useState<Viva | null>(null)
  const [activePage, setActivePage] = useState("dashboard")
  const [vivas, setVivas] = useState<Viva[]>([])

  const refresh = async () => {
    const data = await vivaService.getVivas()
    setVivas(data)
  }

  const handleCreateViva = async (data: Omit<Viva, "id">) => {
    await vivaService.createViva(data)
    await refresh()
  }

  const handleEditViva = async (data: Omit<Viva, "id">) => {
    if (!editingViva) return
    await vivaService.updateViva(editingViva.id, data)
    await refresh()
  }

  const handleDeleteViva = async (vivaId: string) => {
    await vivaService.deleteViva(vivaId)
    await refresh()
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <DashboardLayout activePage={activePage} setActivePage={setActivePage}>

      {/* Create Modal */}
      <CreateVivaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreate={handleCreateViva}
      />

      {/* Edit Modal */}
      <CreateVivaModal
        isOpen={!!editingViva}
        onClose={() => setEditingViva(null)}
        onCreate={handleEditViva}
        initialData={editingViva ?? undefined}
      />

      {/* Dashboard */}
      {activePage === "dashboard" && (
        <>
          <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <Card title="Total Students" value="120" />
            <Card title="Active Vivas" value={vivas.length} />
            <Card title="Evaluated" value="56" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">Create New Viva</h2>
              <p className="opacity-70 mb-4">Upload questions and configure AI evaluation</p>
              <Button onClick={() => setOpen(true)}>Create</Button>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold mb-2">Review Submissions</h2>
              <p className="opacity-70 mb-4">Check AI feedback & grade students</p>
              <Button>Review</Button>
            </GlassCard>
          </div>
        </>
      )}

      {/* Vivas Page */}
      {activePage === "vivas" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Created Vivas</h1>
            <Button onClick={() => setOpen(true)}>+ Create Viva</Button>
          </div>

          {vivas.length === 0 ? (
            <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
              No vivas created yet
            </div>
          ) : (
            <div className="grid gap-4">
              {vivas.map((viva) => (
                <VivaTeacherCard
                  key={viva.id}
                  viva={viva}
                  onEdit={() => setEditingViva(viva)}
                  onDelete={() => handleDeleteViva(viva.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

    </DashboardLayout>
  )
}

/* VivaTeacherCard */

function VivaTeacherCard({
  viva,
  onEdit,
  onDelete,
}: {
  viva: Viva
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Colored top strip based on status */}
      <div className={`h-1 w-full ${
        viva.status === "Enrollment Open" ? "bg-green-400" :
        viva.status === "Enrollment Closed" ? "bg-red-400" : "bg-blue-400"
      }`} />

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">

          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">{viva.module}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                viva.status === "Enrollment Open"
                  ? "bg-green-50 text-green-600 border-green-200"
                  : viva.status === "Enrollment Closed"
                  ? "bg-red-50 text-red-500 border-red-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}>
                {viva.status}
              </span>
            </div>

            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>⏱ {viva.duration} mins</span>
              <span>📅 Deadline: {viva.enrollmentDeadline}</span>
            </div>

            {viva.rubrics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {viva.rubrics.map((rubric) => (
                  <span key={rubric.id} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full border border-purple-100">
                    {rubric.title} · {rubric.maxMarks}m
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">

            {/* Enrollment badge */}
            <div className="text-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 min-w-[64px]">
              <p className="text-xl font-bold text-blue-700">{viva.enrolledStudents.length}</p>
              <p className="text-xs text-blue-500">enrolled</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {viva.enrolledStudents.length > 0 && (
                <button
                  onClick={() => setExpanded((p) => !p)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                  {expanded ? "Hide students" : "View students"}
                </button>
              )}

              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
              >
                ✏️ Edit
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                  <button
                    onClick={() => { setConfirmDelete(false); onDelete() }}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded transition"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg border border-red-100 transition"
                >
                  🗑 Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enrolled students expandable */}
        {expanded && viva.enrolledStudents.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Enrolled Students ({viva.enrolledStudents.length})
            </p>
            <div className="space-y-2">
              {viva.enrolledStudents.map((student, idx) => (
                <div key={student.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">#{idx + 1}</p>
                    <p className="text-xs text-gray-400">{new Date(student.enrolledAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* Shared Components */

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

